// Tela inicial: aulas agrupadas por seção do edital, com situação do download e do progresso.
import { useMemo } from "react";
import { Alert, Pressable, SectionList, Text, View } from "react-native";
import AvisoAtualizacao from "../componentes/AvisoAtualizacao";
import { Botao, Mensagem, Progresso } from "../componentes/basicos";
import { useEstilos } from "../estilos";
import { agruparPorSecao, formatarBytes, formatarTempo, fracaoOuvida, rotuloItem } from "../nucleo/formatos.js";

export default function Lista({ catalogo, progresso, situacoes, downloads, atualizando, mensagem, espaco, aoAbrir, aoAtualizar, aoExcluirTodos }) {
  const { e, cores } = useEstilos();
  const secoes = useMemo(
    () => agruparPorSecao(catalogo).map((g, i, todos) => ({ ...g, novoModulo: i === 0 || todos[i - 1].modulo !== g.modulo, data: g.aulas })),
    [catalogo],
  );

  const faltando = catalogo.aulas.filter((a) => a.mp3 && situacoes[a.id] !== "baixada");
  const bytesFaltando = faltando.reduce((s, a) => s + a.mp3Bytes, 0);
  const baixando = downloads.fila.length > 0;
  const ultima = catalogo.aulas.find((a) => a.id === progresso.ultima);

  function baixarTodas() {
    Alert.alert("Baixar todas", `${faltando.length} aula(s), ${formatarBytes(bytesFaltando)} no total. Prefira uma rede Wi-Fi.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Baixar", onPress: () => downloads.baixar(faltando) },
    ]);
  }

  const cabecalho = (
    <View style={{ paddingTop: 12 }}>
      <AvisoAtualizacao />
      {mensagem ? <Mensagem tipo={mensagem.tipo}>{mensagem.texto}</Mensagem> : null}
      {downloads.erro ? <Mensagem>{downloads.erro}</Mensagem> : null}
      {ultima ? (
        <Pressable onPress={() => aoAbrir(ultima)} style={({ pressed }) => [e.cartao, { marginTop: 10, borderColor: cores.destaque, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[e.textoSuave, { color: cores.destaque, fontWeight: "700" }]}>CONTINUAR</Text>
          <Text style={[e.texto, { fontWeight: "700" }]}>
            {rotuloItem(ultima)} · {ultima.titulo}
          </Text>
          <Text style={e.textoSuave}>{descreverProgresso(ultima, progresso.aulas[ultima.id], situacoes[ultima.id])}</Text>
        </Pressable>
      ) : null}
      <View style={[e.linha, { marginTop: 12 }]}>
        {baixando ? (
          <Botao secundario compacto titulo={`Cancelar downloads (${downloads.fila.length})`} onPress={() => downloads.cancelar()} />
        ) : faltando.length ? (
          <Botao compacto titulo={`Baixar todas (${formatarBytes(bytesFaltando)})`} onPress={baixarTodas} />
        ) : null}
        <Botao secundario compacto titulo={atualizando ? "Atualizando..." : "Atualizar lista"} desativado={atualizando} onPress={aoAtualizar} />
      </View>
    </View>
  );

  const rodape = (
    <View style={{ marginTop: 24, gap: 8 }}>
      <Text style={e.textoSuave}>
        {catalogo.aulas.length} aulas · áudios baixados ocupam {formatarBytes(espaco)}
      </Text>
      {espaco > 0 ? (
        <Botao
          secundario
          compacto
          titulo="Apagar todos os áudios"
          estilo={{ alignSelf: "flex-start" }}
          onPress={() =>
            Alert.alert("Apagar todos os áudios?", "O progresso de cada aula é mantido. Você pode baixar de novo depois.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Apagar", style: "destructive", onPress: aoExcluirTodos },
            ])
          }
        />
      ) : null}
    </View>
  );

  return (
    <SectionList
      sections={secoes}
      keyExtractor={(a) => a.id}
      contentContainerStyle={e.pagina}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={cabecalho}
      ListFooterComponent={rodape}
      renderSectionHeader={({ section }) => (
        <View>
          {section.novoModulo ? <Text style={[e.titulo, { marginTop: 22, fontSize: 20 }]}>{section.tituloModulo}</Text> : null}
          <Text style={[e.subtitulo, { marginTop: section.novoModulo ? 4 : 16 }]}>
            {section.secao} · {section.titulo}
          </Text>
        </View>
      )}
      renderItem={({ item: aula }) => (
        <ItemAula
          aula={aula}
          p={progresso.aulas[aula.id]}
          situacao={situacoes[aula.id]}
          fracaoDownload={downloads.fracoes[aula.id]}
          naFila={downloads.fila.includes(aula.id)}
          aoAbrir={() => aoAbrir(aula)}
          aoBaixar={() => downloads.baixar([aula])}
          aoCancelar={() => downloads.cancelar(aula.id)}
        />
      )}
    />
  );
}

function descreverProgresso(aula, p, situacao) {
  const partes = [];
  if (!aula.mp3) partes.push("Sem áudio: leitura com a voz do aparelho");
  else if (situacao === "baixada") partes.push("Baixada");
  else if (situacao === "desatualizada") partes.push("Nova versão do áudio");
  else partes.push(`Não baixada · ${formatarBytes(aula.mp3Bytes)}`);
  if (p?.concluida) partes.push("concluída");
  else if (p?.modo === "voz" && p.paragrafo > 0) partes.push(`parágrafo ${p.paragrafo + 1} de ${p.paragrafos}`);
  else if (p?.modo === "audio" && p.total && p.posicao > 1) partes.push(`${formatarTempo(p.posicao)} de ${formatarTempo(p.total)}`);
  return partes.join(" · ");
}

function ItemAula({ aula, p, situacao, fracaoDownload, naFila, aoAbrir, aoBaixar, aoCancelar }) {
  const { e, cores } = useEstilos();
  const fracao = fracaoOuvida(p);
  let acao = null;
  if (fracaoDownload != null) {
    acao = <Botao secundario compacto titulo={`${Math.round(fracaoDownload * 100)}% ✕`} rotuloAcessivel="Cancelar download" onPress={aoCancelar} />;
  } else if (naFila) {
    acao = <Botao secundario compacto titulo="Na fila ✕" rotuloAcessivel="Tirar da fila" onPress={aoCancelar} />;
  } else if (aula.mp3 && situacao !== "baixada") {
    acao = <Botao secundario compacto titulo="Baixar" rotuloAcessivel={`Baixar ${aula.titulo}`} onPress={aoBaixar} />;
  }
  return (
    <Pressable
      onPress={aoAbrir}
      accessibilityRole="button"
      accessibilityLabel={`${rotuloItem(aula)} ${aula.titulo}`}
      style={({ pressed }) => [e.cartaoToque, { padding: 12, opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[e.textoSuave, { fontWeight: "700", color: p?.concluida ? cores.certo : cores.textoSuave }]}>
            {p?.concluida ? "✓ " : ""}
            {rotuloItem(aula)}
          </Text>
          <Text style={[e.texto, { fontWeight: "600" }]}>{aula.titulo}</Text>
          <Text style={[e.textoSuave, { fontSize: 13 }]}>{descreverProgresso(aula, p, situacao)}</Text>
        </View>
        {acao}
      </View>
      {fracaoDownload != null ? (
        <View style={{ marginTop: 8 }}>
          <Progresso fracao={fracaoDownload} />
        </View>
      ) : fracao > 0 && fracao < 1 ? (
        <View style={{ marginTop: 8 }}>
          <Progresso fracao={fracao} altura={3} />
        </View>
      ) : null}
    </Pressable>
  );
}
