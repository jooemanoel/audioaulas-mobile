// Componente raiz: lista de aulas ↔ tela da aula, com um mini player na lista.
// O player fica aqui (e não na tela da aula) para o áudio continuar ao voltar para a lista.
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Barra } from "./src/componentes/basicos";
import { useDownloads } from "./src/estado/useDownloads";
import { useProgresso } from "./src/estado/useProgresso";
import { useReprodutor } from "./src/estado/useReprodutor";
import { useEstilos } from "./src/estilos";
import { formatarTempo, rotuloItem } from "./src/nucleo/formatos.js";
import { atualizarCatalogo, catalogoLocal, espacoUsado, excluirAudio, situacaoAudio } from "./src/servicos/armazenamento";
import Aula from "./src/telas/Aula";
import Lista from "./src/telas/Lista";

export default function App() {
  return (
    <SafeAreaProvider>
      <Aplicativo />
    </SafeAreaProvider>
  );
}

function Aplicativo() {
  const { e, cores } = useEstilos();
  const margens = useSafeAreaInsets();
  const [catalogo, setCatalogo] = useState(catalogoLocal);
  const [aberta, setAberta] = useState(null); // id da aula na tela
  const [versaoArquivos, setVersaoArquivos] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const { progresso, atualizarAula, atualizarGeral } = useProgresso();
  const reprodutor = useReprodutor({ progresso, atualizarAula, atualizarGeral });
  const arquivosMudaram = useCallback(() => setVersaoArquivos((v) => v + 1), []);
  const downloads = useDownloads({ aoConcluir: arquivosMudaram });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula quando os arquivos mudam
  const situacoes = useMemo(() => Object.fromEntries(catalogo.aulas.map((a) => [a.id, situacaoAudio(a)])), [catalogo, versaoArquivos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const espaco = useMemo(() => espacoUsado(), [versaoArquivos]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(cores.fundo).catch(() => {});
  }, [cores.fundo]);

  async function atualizarManual() {
    setAtualizando(true);
    try {
      const novo = await atualizarCatalogo();
      const novas = novo.aulas.length - catalogo.aulas.length;
      setCatalogo(novo);
      setMensagem({ tipo: "ok", texto: novas > 0 ? `${novas} aula(s) nova(s).` : "A lista já está atualizada." });
    } catch (err) {
      setMensagem({ tipo: "aviso", texto: `Sem conexão? ${err?.message || err}` });
    } finally {
      setAtualizando(false);
    }
  }

  // Busca aulas novas ao abrir o app (silencioso se estiver offline).
  useEffect(() => {
    atualizarCatalogo()
      .then((novo) =>
        setCatalogo((antigo) => {
          const novas = novo.aulas.length - antigo.aulas.length;
          if (novas > 0) setMensagem({ tipo: "ok", texto: `${novas} aula(s) nova(s) na lista.` });
          return novo;
        }),
      )
      .catch(() => {});
  }, []);

  const voltar = useCallback(() => {
    if (!aberta) return false;
    setAberta(null);
    return true;
  }, [aberta]);

  useEffect(() => {
    const s = BackHandler.addEventListener("hardwareBackPress", voltar);
    return () => s.remove();
  }, [voltar]);

  const aula = catalogo.aulas.find((a) => a.id === aberta);
  const atual = reprodutor.atual;

  function excluirAudioDa(a) {
    if (atual?.aula.id === a.id && atual.modo === "audio") reprodutor.fechar();
    excluirAudio(a);
    arquivosMudaram();
  }

  function excluirTodos() {
    if (atual?.modo === "audio") reprodutor.fechar();
    catalogo.aulas.filter((a) => a.mp3).forEach(excluirAudio);
    arquivosMudaram();
  }

  function marcarConcluida(a, concluida) {
    atualizarAula(a.id, concluida ? { concluida: true } : { concluida: false, posicao: 0, paragrafo: 0 });
  }

  return (
    <View style={[e.app, { paddingTop: margens.top, paddingBottom: margens.bottom }]}>
      <StatusBar style={cores.escuro ? "light" : "dark"} />
      <Barra titulo={aula ? rotuloItem(aula) : "Audioaulas"} aoVoltar={aula ? voltar : null} />
      <View style={{ flex: 1 }}>
        {aula ? (
          <Aula
            key={aula.id}
            aula={aula}
            grupos={catalogo.grupos}
            situacao={situacoes[aula.id]}
            p={progresso.aulas[aula.id]}
            reprodutor={reprodutor}
            downloads={downloads}
            aoConcluida={(c) => marcarConcluida(aula, c)}
            aoExcluirAudio={() => excluirAudioDa(aula)}
          />
        ) : (
          <Lista
            catalogo={catalogo}
            progresso={progresso}
            situacoes={situacoes}
            downloads={downloads}
            atualizando={atualizando}
            mensagem={mensagem}
            espaco={espaco}
            aoAbrir={(a) => {
              setMensagem(null);
              setAberta(a.id);
            }}
            aoAtualizar={atualizarManual}
            aoExcluirTodos={excluirTodos}
          />
        )}
      </View>
      {!aula && atual ? <MiniPlayer reprodutor={reprodutor} aoAbrir={() => setAberta(atual.aula.id)} /> : null}
    </View>
  );
}

function MiniPlayer({ reprodutor, aoAbrir }) {
  const { e, cores } = useEstilos();
  const { atual, status, voz } = reprodutor;
  const audio = atual.modo === "audio";
  const tocando = audio ? status.playing : voz.falando;
  const detalhe = audio
    ? `${formatarTempo(status.currentTime)} / ${formatarTempo(status.duration)}`
    : `Voz do aparelho · parágrafo ${voz.indice + 1} de ${voz.paragrafos.length}`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderTopWidth: 1, borderColor: cores.borda, backgroundColor: cores.superficie }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir a aula" onPress={aoAbrir} style={{ flex: 1 }}>
        <Text style={[e.texto, { fontWeight: "700" }]} numberOfLines={1}>
          {rotuloItem(atual.aula)} · {atual.aula.titulo}
        </Text>
        <Text style={e.textoSuave}>{detalhe}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tocando ? "Pausar" : "Tocar"}
        onPress={audio ? reprodutor.alternar : reprodutor.alternarVoz}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: cores.destaque, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}
      >
        <Text style={[e.botaoTexto, { fontSize: 20 }]}>{tocando ? "❚❚" : "▶"}</Text>
      </Pressable>
    </View>
  );
}
