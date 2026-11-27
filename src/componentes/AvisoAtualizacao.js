// Cartão "Versão X disponível" quando há uma release mais nova no GitHub, no topo da lista.
// A consulta é feita ao abrir o app e ao voltar para ele (no máximo uma vez por hora na
// rede; veja servicos/atualizacao.js). "Depois" esconde o aviso daquela versão até o app
// ser aberto de novo; se sair outra versão nesse meio-tempo, o aviso volta.
//
// "Atualizar agora" baixa o APK dentro do app e abre o instalador do Android (o download
// pelo navegador às vezes trava em 100%). Se falhar, o botão passa a abrir o navegador.
import { useEffect, useState } from "react";
import { AppState, Linking, Platform, Text, View } from "react-native";
import { useEstilos } from "../estilos";
import { VERSAO_INSTALADA, baixarEInstalar, limparDownloads, verificarAtualizacao } from "../servicos/atualizacao";
import { Botao } from "./basicos";

// Fora do componente: a lista é desmontada ao abrir uma aula, e o aviso não deve piscar
// nem voltar depois do "Depois" quando ela é montada de novo.
let novaConhecida = null;
let adiada = null;

export default function AvisoAtualizacao() {
  const { e, cores } = useEstilos();
  const [nova, setNova] = useState(novaConhecida);
  const [escondida, setEscondida] = useState(adiada);
  const [progresso, setProgresso] = useState(null); // null = parado; 0 a 1 (ou -1 sem tamanho) = baixando
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const verificar = () =>
      verificarAtualizacao().then((resultado) => {
        novaConhecida = resultado;
        setNova(resultado);
        // Em dia: o APK baixado para a atualização (se houver) já foi instalado.
        if (!resultado && Platform.OS === "android") limparDownloads();
      });
    verificar();
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") verificar();
    });
    return () => assinatura.remove();
  }, []);

  if (!nova || nova.versao === escondida) return null;

  const peloApp = Platform.OS === "android" && !falhou && /\.apk$/i.test(nova.url);
  const baixando = progresso !== null;

  async function atualizar() {
    if (!peloApp) return Linking.openURL(nova.url);
    setProgresso(0);
    try {
      await baixarEInstalar(nova, (p) => setProgresso(p ?? -1));
    } catch {
      setFalhou(true);
    } finally {
      setProgresso(null);
    }
  }

  const tituloBotao = !baixando
    ? peloApp
      ? "Atualizar agora"
      : "Baixar pelo navegador"
    : progresso >= 0
      ? `Baixando… ${Math.round(progresso * 100)}%`
      : "Baixando…";

  return (
    <View style={[e.cartao, { marginTop: 10, gap: 12, borderColor: cores.destaque }]} accessibilityRole="alert">
      <Text style={e.texto}>
        <Text style={{ fontWeight: "700" }}>Versão {nova.versao} disponível.</Text> Você está com a {VERSAO_INSTALADA}. A
        nova versão instala por cima; as aulas baixadas e o progresso são mantidos.
      </Text>
      {falhou ? <Text style={e.textoSuave}>Não deu para baixar a atualização. Tente pelo navegador.</Text> : null}
      <View style={e.linha}>
        <Botao titulo={tituloBotao} onPress={atualizar} desativado={baixando} />
        {!baixando ? (
          <Botao
            secundario
            titulo="Depois"
            onPress={() => {
              adiada = nova.versao;
              setEscondida(nova.versao);
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
