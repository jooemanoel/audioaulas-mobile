// Reprodução das aulas. Dois modos, nunca ao mesmo tempo:
//  - "audio": toca o MP3 baixado (expo-audio), com tela de bloqueio e segundo plano.
//  - "voz": lê o texto parágrafo a parágrafo com a voz do aparelho (expo-speech),
//    para aulas que ainda não têm MP3 ou que não foram baixadas.
import { requestNotificationPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { uriAudio } from "../servicos/armazenamento";

const SALVAR_A_CADA = 5; // segundos de áudio
const TAG_ACORDADO = "leitura-em-voz";

export function useReprodutor({ progresso, atualizarAula, atualizarGeral }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [atual, setAtual] = useState(null); // { aula, modo }
  const [voz, setVoz] = useState({ paragrafos: [], indice: 0, falando: false });

  const velocidade = progresso.velocidade || 1;
  // Valores mais recentes, para ler dentro de callbacks e eventos nativos.
  const ref = useRef({});
  useLayoutEffect(() => {
    ref.current = { atual, status, velocidade, voz, progresso };
  });
  const falarRef = useRef(null);
  const buscaPendente = useRef(null);
  const ultimaGravacao = useRef(0);
  const fichaVoz = useRef(0); // invalida callbacks de falas interrompidas
  const pediuNotificacao = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {});
  }, []);

  // ---------- Áudio ----------

  const salvarPosicao = useCallback(() => {
    const { atual: a, status: s } = ref.current;
    if (a?.modo !== "audio" || !s.isLoaded || buscaPendente.current != null) return;
    atualizarAula(a.aula.id, { modo: "audio", posicao: s.currentTime, total: s.duration || undefined });
    ultimaGravacao.current = s.currentTime;
  }, [atualizarAula]);

  const pararVoz = useCallback(() => {
    fichaVoz.current++;
    Speech.stop();
    deactivateKeepAwake(TAG_ACORDADO);
    setVoz((v) => ({ ...v, falando: false }));
  }, []);

  /** Carrega o MP3 da aula no player (continua de onde parou). tocar: já começa a tocar. */
  const abrirAudio = useCallback(
    (aula, { tocar = false } = {}) => {
      const { atual: a } = ref.current;
      if (a?.modo === "voz") pararVoz();
      if (a?.modo === "audio" && a.aula.id === aula.id) {
        if (tocar) player.play();
        return;
      }
      salvarPosicao();
      const p = ref.current.progresso.aulas[aula.id];
      buscaPendente.current = p && !p.concluida ? p.posicao || 0 : 0;
      ultimaGravacao.current = buscaPendente.current;
      player.replace({ uri: uriAudio(aula) });
      player.setActiveForLockScreen(
        true,
        { title: `${aula.item} ${aula.titulo}${aula.parte ? ` (parte ${aula.parte})` : ""}`, artist: "Audioaulas" },
        { showSeekBackward: true, showSeekForward: true },
      );
      setAtual({ aula, modo: "audio" });
      atualizarGeral({ ultima: aula.id });
      if (tocar) player.play();
    },
    [player, pararVoz, salvarPosicao, atualizarGeral],
  );

  // Depois de carregar: vai para a posição salva e aplica a velocidade.
  useEffect(() => {
    if (!status.isLoaded || buscaPendente.current == null) return;
    const alvo = buscaPendente.current;
    buscaPendente.current = null;
    player.setPlaybackRate(ref.current.velocidade);
    if (alvo > 1) player.seekTo(alvo).catch(() => {});
  }, [status.isLoaded, player]);

  // Grava a posição a cada alguns segundos tocando, ao pausar e ao terminar.
  useEffect(() => {
    if (atual?.modo !== "audio") return;
    if (status.didJustFinish) {
      atualizarAula(atual.aula.id, { modo: "audio", posicao: 0, total: status.duration, concluida: true });
      return;
    }
    if (status.playing && Math.abs(status.currentTime - ultimaGravacao.current) >= SALVAR_A_CADA) salvarPosicao();
  }, [status.currentTime, status.playing, status.didJustFinish, status.duration, atual, atualizarAula, salvarPosicao]);

  useEffect(() => {
    if (!status.playing) salvarPosicao();
  }, [status.playing, salvarPosicao]);

  useEffect(() => {
    const s = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") salvarPosicao();
    });
    return () => s.remove();
  }, [salvarPosicao]);

  const alternar = useCallback(async () => {
    if (ref.current.atual?.modo !== "audio") return;
    if (ref.current.status.playing) {
      player.pause();
      return;
    }
    // Android 13+: a notificação de mídia (controles na tela de bloqueio) precisa de permissão.
    if (!pediuNotificacao.current) {
      pediuNotificacao.current = true;
      requestNotificationPermissionsAsync().catch(() => {});
    }
    if (ref.current.status.didJustFinish || ref.current.status.currentTime >= (ref.current.status.duration || Infinity) - 0.5) {
      await player.seekTo(0).catch(() => {});
    }
    player.play();
  }, [player]);

  const pular = useCallback(
    (segundos) => {
      const s = ref.current.status;
      if (!s.isLoaded) return;
      player.seekTo(Math.min(Math.max(0, s.currentTime + segundos), Math.max(0, (s.duration || 0) - 1))).catch(() => {});
    },
    [player],
  );

  const irPara = useCallback(
    (fracao) => {
      const s = ref.current.status;
      if (!s.isLoaded || !s.duration) return;
      player.seekTo(fracao * s.duration).catch(() => {});
    },
    [player],
  );

  /** Fecha o áudio (ex.: o MP3 da aula foi excluído). */
  const fechar = useCallback(() => {
    salvarPosicao();
    pararVoz();
    player.pause();
    player.clearLockScreenControls();
    player.replace(null);
    setAtual(null);
  }, [player, pararVoz, salvarPosicao]);

  // ---------- Velocidade (vale para os dois modos) ----------

  const mudarVelocidade = useCallback(
    (v) => {
      atualizarGeral({ velocidade: v });
      if (ref.current.atual?.modo === "audio") player.setPlaybackRate(v);
    },
    [player, atualizarGeral],
  );

  // ---------- Voz do aparelho ----------

  const falar = useCallback(
    (aula, paragrafos, indice) => {
      if (indice >= paragrafos.length) {
        atualizarAula(aula.id, { modo: "voz", paragrafo: 0, paragrafos: paragrafos.length, concluida: true });
        pararVoz();
        return;
      }
      const ficha = ++fichaVoz.current;
      Speech.stop();
      setVoz({ paragrafos, indice, falando: true });
      atualizarAula(aula.id, { modo: "voz", paragrafo: indice, paragrafos: paragrafos.length });
      Speech.speak(paragrafos[indice], {
        language: "pt-BR",
        rate: ref.current.velocidade,
        onDone: () => {
          if (ficha === fichaVoz.current) falarRef.current(aula, paragrafos, indice + 1);
        },
        onError: () => {
          if (ficha === fichaVoz.current) pararVoz();
        },
      });
    },
    [atualizarAula, pararVoz],
  );

  useLayoutEffect(() => {
    falarRef.current = falar;
  }, [falar]);

  /** Prepara a leitura em voz da aula (sem começar a falar). */
  const abrirVoz = useCallback(
    (aula, paragrafos) => {
      const { atual: a } = ref.current;
      if (a?.modo === "voz" && a.aula.id === aula.id && ref.current.voz.paragrafos.length) return;
      if (a?.modo === "audio") {
        salvarPosicao();
        player.pause();
      }
      pararVoz();
      const p = ref.current.progresso.aulas[aula.id];
      const indice = p && !p.concluida ? Math.min(p.paragrafo || 0, paragrafos.length - 1) : 0;
      setVoz({ paragrafos, indice, falando: false });
      setAtual({ aula, modo: "voz" });
      atualizarGeral({ ultima: aula.id });
    },
    [player, pararVoz, salvarPosicao, atualizarGeral],
  );

  const alternarVoz = useCallback(() => {
    const { atual: a, voz: v } = ref.current;
    if (a?.modo !== "voz") return;
    if (v.falando) {
      pararVoz();
      return;
    }
    // A fala é controlada pelo JavaScript: com a tela apagada o Android pode suspender o app.
    activateKeepAwakeAsync(TAG_ACORDADO).catch(() => {});
    falar(a.aula, v.paragrafos, v.indice);
  }, [falar, pararVoz]);

  const irParaParagrafo = useCallback(
    (indice) => {
      const { atual: a, voz: v } = ref.current;
      if (a?.modo !== "voz") return;
      const i = Math.min(Math.max(0, indice), v.paragrafos.length - 1);
      if (v.falando) falar(a.aula, v.paragrafos, i);
      else {
        setVoz((x) => ({ ...x, indice: i }));
        atualizarAula(a.aula.id, { modo: "voz", paragrafo: i, paragrafos: v.paragrafos.length });
      }
    },
    [falar, atualizarAula],
  );

  // Ao mudar a velocidade com a voz falando, recomeça o parágrafo atual na nova velocidade.
  useEffect(() => {
    const { atual: a, voz: v } = ref.current;
    if (a?.modo === "voz" && v.falando) falar(a.aula, v.paragrafos, v.indice);
  }, [velocidade, falar]);

  useEffect(() => () => Speech.stop(), []);

  return {
    atual,
    status,
    velocidade,
    voz,
    abrirAudio,
    alternar,
    pular,
    irPara,
    fechar,
    mudarVelocidade,
    abrirVoz,
    alternarVoz,
    irParaParagrafo,
    pararVoz,
  };
}
