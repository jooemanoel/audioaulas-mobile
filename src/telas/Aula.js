// Tela de uma aula: player do MP3 (se baixado) ou leitura com a voz do aparelho, e o texto.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { BarraPosicao, Botao, Mensagem, Opcoes, Progresso } from "../componentes/basicos";
import { useEstilos } from "../estilos";
import { formatarBytes, formatarTempo, paragrafos as dividir, rotuloItem } from "../nucleo/formatos.js";
import { textoDaAula } from "../servicos/armazenamento";

const VELOCIDADES = [0.8, 1, 1.25, 1.5, 1.75, 2].map((v) => ({ valor: v, rotulo: `${String(v).replace(".", ",")}x` }));

export default function Aula({ aula, grupos, situacao, p, reprodutor, downloads, aoConcluida, aoExcluirAudio }) {
  const { e, cores } = useEstilos();
  const [texto, setTexto] = useState(null);
  const [erroTexto, setErroTexto] = useState(null);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [usarVoz, setUsarVoz] = useState(false);
  const temAudio = situacao === "baixada" || situacao === "desatualizada";
  const modoVoz = !temAudio && (usarVoz || !aula.mp3);
  const precisaTexto = modoVoz || mostrarTexto;
  const pars = useMemo(() => (texto ? dividir(texto) : []), [texto]);

  // Carrega o texto quando ele é necessário (leitura em voz ou "Mostrar texto").
  useEffect(() => {
    if (!precisaTexto || texto != null) return;
    let vivo = true;
    textoDaAula(aula)
      .then((t) => vivo && setTexto(t))
      .catch((err) => vivo && setErroTexto(err?.message || String(err)));
    return () => {
      vivo = false;
    };
  }, [precisaTexto, texto, aula]);

  // Prepara o player certo ao abrir a aula, sem interromper outra aula que esteja tocando.
  const { abrirAudio, abrirVoz } = reprodutor;
  const outraTocando =
    reprodutor.atual != null && reprodutor.atual.aula.id !== aula.id && (reprodutor.status.playing || reprodutor.voz.falando);
  const naoInterromper = useRef(outraTocando);
  useEffect(() => {
    if (temAudio && !naoInterromper.current) abrirAudio(aula);
  }, [temAudio, aula, abrirAudio]);
  useEffect(() => {
    if (modoVoz && pars.length && !naoInterromper.current) abrirVoz(aula, pars);
  }, [modoVoz, pars, aula, abrirVoz]);

  const ativa = reprodutor.atual?.aula.id === aula.id;
  const indiceVoz = modoVoz && ativa ? reprodutor.voz.indice : null;

  // Na leitura em voz, mantém o parágrafo atual visível.
  const rolagem = useRef(null);
  const yTexto = useRef(0);
  const yParagrafos = useRef({});
  useEffect(() => {
    const y = yParagrafos.current[indiceVoz];
    if (indiceVoz == null || y == null || !reprodutor.voz.falando) return;
    rolagem.current?.scrollTo({ y: Math.max(0, yTexto.current + y - 160), animated: true });
  }, [indiceVoz, reprodutor.voz.falando]);
  const fracaoDownload = downloads.fracoes[aula.id];
  const naFila = downloads.fila.includes(aula.id);

  return (
    <ScrollView ref={rolagem} contentContainerStyle={e.pagina}>
      <Text style={[e.textoSuave, { fontWeight: "700" }]}>
        {rotuloItem(aula)} · {grupos[aula.secao] ?? ""}
      </Text>
      <Text style={e.titulo}>{aula.titulo}</Text>
      {p?.concluida ? <Text style={[e.textoSuave, { color: cores.certo, fontWeight: "700" }]}>✓ Concluída</Text> : null}

      {temAudio ? (
        <PlayerAudio reprodutor={reprodutor} ativa={ativa} aoAtivar={() => abrirAudio(aula, { tocar: true })} />
      ) : modoVoz ? (
        <PlayerVoz reprodutor={reprodutor} ativa={ativa} pars={pars} carregando={!texto && !erroTexto} aoAtivar={() => abrirVoz(aula, pars)} />
      ) : (
        <View style={[e.cartao, { marginTop: 14, gap: 10 }]}>
          <Text style={e.texto}>O áudio desta aula ainda não está no aparelho ({formatarBytes(aula.mp3Bytes)}).</Text>
          {fracaoDownload != null ? (
            <>
              <Progresso fracao={fracaoDownload} altura={6} />
              <Botao secundario titulo={`Baixando ${Math.round(fracaoDownload * 100)}%: cancelar`} onPress={() => downloads.cancelar(aula.id)} />
            </>
          ) : naFila ? (
            <Botao secundario titulo="Na fila de downloads: cancelar" onPress={() => downloads.cancelar(aula.id)} />
          ) : (
            <Botao titulo="Baixar áudio" onPress={() => downloads.baixar([aula])} />
          )}
          <Botao secundario titulo="Ouvir agora com a voz do aparelho" onPress={() => setUsarVoz(true)} />
        </View>
      )}
      {downloads.erro ? <Mensagem>{downloads.erro}</Mensagem> : null}
      {situacao === "desatualizada" && fracaoDownload == null ? (
        <View style={{ marginTop: 10 }}>
          <Mensagem tipo="aviso">Há uma versão nova do áudio desta aula.</Mensagem>
          <Botao secundario compacto titulo="Baixar a versão nova" estilo={{ marginTop: 8, alignSelf: "flex-start" }} onPress={() => downloads.baixar([aula])} />
        </View>
      ) : null}

      {temAudio || modoVoz ? (
        <Opcoes rotulo="Velocidade" opcoes={VELOCIDADES} valor={reprodutor.velocidade} aoMudar={reprodutor.mudarVelocidade} />
      ) : null}

      <View style={[e.linha, { marginTop: 16 }]}>
        {!modoVoz ? <Botao secundario compacto titulo={mostrarTexto ? "Ocultar texto" : "Mostrar texto"} onPress={() => setMostrarTexto((m) => !m)} /> : null}
        <Botao secundario compacto titulo={p?.concluida ? "Marcar como não concluída" : "Marcar como concluída"} onPress={() => aoConcluida(!p?.concluida)} />
        {temAudio ? (
          <Botao
            secundario
            compacto
            titulo="Excluir áudio"
            onPress={() =>
              Alert.alert("Excluir o áudio desta aula?", `Libera ${formatarBytes(aula.mp3Bytes)}. O progresso é mantido.`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: aoExcluirAudio },
              ])
            }
          />
        ) : null}
      </View>

      {erroTexto && precisaTexto ? <Mensagem>{erroTexto}</Mensagem> : null}
      {precisaTexto && texto ? (
        <View onLayout={(ev) => (yTexto.current = ev.nativeEvent.layout.y)}>
          <Texto pars={pars} atual={indiceVoz} aoTocar={modoVoz ? reprodutor.irParaParagrafo : null} posicoes={yParagrafos} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function PlayerAudio({ reprodutor, ativa, aoAtivar }) {
  const { e } = useEstilos();
  const { status } = reprodutor;
  const [previa, setPrevia] = useState(null);
  if (!ativa) return <OutraAula titulo="Tocar esta aula" aoAtivar={aoAtivar} />;
  if (!status.isLoaded) {
    return (
      <View style={[e.cartao, { marginTop: 14, alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }
  const duracao = status.duration || 0;
  const tempo = previa != null ? previa * duracao : status.currentTime;
  return (
    <View style={[e.cartao, { marginTop: 14 }]}>
      <BarraPosicao
        fracao={duracao ? status.currentTime / duracao : 0}
        aoArrastar={setPrevia}
        aoSoltar={(f) => {
          setPrevia(null);
          reprodutor.irPara(f);
        }}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={e.textoSuave}>{formatarTempo(tempo)}</Text>
        <Text style={e.textoSuave}>-{formatarTempo(duracao - tempo)}</Text>
      </View>
      <Controles
        aoVoltar={() => reprodutor.pular(-15)}
        rotuloVoltar="↺ 15s"
        aoAlternar={reprodutor.alternar}
        tocando={status.playing}
        aoAvancar={() => reprodutor.pular(30)}
        rotuloAvancar="30s ↻"
      />
      {status.isBuffering && status.playing ? <Text style={[e.textoSuave, { textAlign: "center" }]}>Carregando...</Text> : null}
      {status.error ? <Mensagem>{status.error}</Mensagem> : null}
    </View>
  );
}

function PlayerVoz({ reprodutor, ativa, pars, carregando, aoAtivar }) {
  const { e } = useEstilos();
  if (!carregando && !ativa) return <OutraAula titulo="Ler esta aula" aoAtivar={aoAtivar} />;
  if (carregando) {
    return (
      <View style={[e.cartao, { marginTop: 14, alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }
  const { indice, falando } = reprodutor.voz;
  return (
    <View style={[e.cartao, { marginTop: 14 }]}>
      <Text style={[e.textoSuave, { marginBottom: 8 }]}>Leitura com a voz do aparelho. A tela fica ligada enquanto lê.</Text>
      <Progresso fracao={pars.length ? indice / pars.length : 0} altura={6} />
      <Text style={[e.textoSuave, { marginTop: 6 }]}>
        Parágrafo {indice + 1} de {pars.length}
      </Text>
      <Controles
        aoVoltar={() => reprodutor.irParaParagrafo(indice - 1)}
        rotuloVoltar="⏮ Anterior"
        aoAlternar={reprodutor.alternarVoz}
        tocando={falando}
        aoAvancar={() => reprodutor.irParaParagrafo(indice + 1)}
        rotuloAvancar="Próximo ⏭"
      />
    </View>
  );
}

/** Outra aula está tocando: só troca quando o usuário pedir. */
function OutraAula({ titulo, aoAtivar }) {
  const { e } = useEstilos();
  return (
    <View style={[e.cartao, { marginTop: 14, gap: 10 }]}>
      <Text style={e.textoSuave}>Outra aula está tocando.</Text>
      <Botao titulo={titulo} onPress={aoAtivar} />
    </View>
  );
}

function Controles({ aoVoltar, rotuloVoltar, aoAlternar, tocando, aoAvancar, rotuloAvancar }) {
  const { e, cores } = useEstilos();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
      <Botao secundario titulo={rotuloVoltar} onPress={aoVoltar} estilo={{ minWidth: 92 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tocando ? "Pausar" : "Tocar"}
        onPress={aoAlternar}
        style={({ pressed }) => ({
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: cores.destaque,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={[e.botaoTexto, { fontSize: 28 }]}>{tocando ? "❚❚" : "▶"}</Text>
      </Pressable>
      <Botao secundario titulo={rotuloAvancar} onPress={aoAvancar} estilo={{ minWidth: 92 }} />
    </View>
  );
}

function Texto({ pars, atual, aoTocar, posicoes }) {
  const { e, cores } = useEstilos();
  return (
    <View style={{ marginTop: 18, gap: 4 }}>
      {aoTocar ? <Text style={[e.textoSuave, { marginBottom: 6 }]}>Toque num parágrafo para ler a partir dele.</Text> : null}
      {pars.map((par, i) => (
        <Pressable
          key={i}
          disabled={!aoTocar}
          onPress={() => aoTocar?.(i)}
          onLayout={(ev) => (posicoes.current[i] = ev.nativeEvent.layout.y)}
          style={{ borderRadius: 6, padding: 6, backgroundColor: i === atual ? cores.avisoFundo : "transparent" }}
        >
          <Text style={[e.texto, { fontSize: 17, lineHeight: 26 }]}>{par}</Text>
        </Pressable>
      ))}
    </View>
  );
}
