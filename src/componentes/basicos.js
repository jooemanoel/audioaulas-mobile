// Componentes simples reutilizados nas telas.
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useEstilos } from "../estilos";

export function Botao({ titulo, onPress, secundario, desativado, estilo, rotuloAcessivel, compacto }) {
  const { e } = useEstilos();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel || titulo}
      accessibilityState={{ disabled: !!desativado }}
      disabled={desativado}
      onPress={onPress}
      style={({ pressed }) => [
        secundario ? e.botaoSecundario : e.botao,
        compacto && { minHeight: 38, paddingVertical: 6, paddingHorizontal: 12 },
        { opacity: desativado ? 0.45 : pressed ? 0.75 : 1 },
        estilo,
      ]}
    >
      <Text style={secundario ? e.botaoSecundarioTexto : e.botaoTexto}>{titulo}</Text>
    </Pressable>
  );
}

/** Grupo de opções (uma escolhida). opcoes: [{ valor, rotulo }] */
export function Opcoes({ opcoes, valor, aoMudar, rotulo }) {
  const { e } = useEstilos();
  return (
    <View>
      {rotulo ? <Text style={e.rotulo}>{rotulo}</Text> : null}
      <View style={e.linha} accessibilityRole="radiogroup">
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={o.acessivel || o.rotulo}
              onPress={() => aoMudar(o.valor)}
              style={[e.chip, ativo && e.chipAtivo]}
            >
              <Text style={[e.chipTexto, ativo && e.chipTextoAtivo]}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Mensagem({ tipo = "erro", children }) {
  const { e } = useEstilos();
  const caixa = { erro: e.erro, aviso: e.aviso, ok: e.ok }[tipo];
  const texto = { erro: e.erroTexto, aviso: e.avisoTexto, ok: e.okTexto }[tipo];
  return (
    <View style={caixa} accessibilityLiveRegion="polite">
      <Text style={texto}>{children}</Text>
    </View>
  );
}

/** Barra superior com "voltar" e ações. */
export function Barra({ titulo, aoVoltar, children }) {
  const { e, cores } = useEstilos();
  return (
    <View style={e.barra}>
      {aoVoltar ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoVoltar} hitSlop={12} style={{ padding: 6 }}>
          <Text style={{ color: cores.destaque, fontSize: 22, fontWeight: "700" }}>‹</Text>
        </Pressable>
      ) : null}
      <Text style={e.barraTitulo} numberOfLines={1}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

/** Barra fina de progresso (0 a 1), só para exibir. */
export function Progresso({ fracao, altura = 4 }) {
  const { cores } = useEstilos();
  return (
    <View style={{ height: altura, borderRadius: altura / 2, backgroundColor: cores.borda, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, fracao)) * 1000) / 10}%`, height: "100%", backgroundColor: cores.destaque }} />
    </View>
  );
}

/** Barra de posição arrastável: aoSoltar(fração 0..1); aoArrastar mostra a prévia. */
export function BarraPosicao({ fracao, aoSoltar, aoArrastar }) {
  const { cores } = useEstilos();
  const largura = useRef(1);
  const inicioX = useRef(0); // borda esquerda da barra na tela
  const [arrastando, setArrastando] = useState(null);

  const calcular = (pageX) => Math.min(1, Math.max(0, (pageX - inicioX.current) / largura.current));
  const mover = (ev) => {
    const f = calcular(ev.nativeEvent.pageX);
    setArrastando(f);
    aoArrastar?.(f);
  };

  const f = arrastando ?? fracao;
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Posição da aula"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
      onLayout={(ev) => (largura.current = ev.nativeEvent.layout.width || 1)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(ev) => {
        inicioX.current = ev.nativeEvent.pageX - ev.nativeEvent.locationX;
        mover(ev);
      }}
      onResponderMove={mover}
      onResponderRelease={(ev) => {
        setArrastando(null);
        aoSoltar(calcular(ev.nativeEvent.pageX));
      }}
      onResponderTerminate={() => setArrastando(null)}
      style={{ height: 36, justifyContent: "center" }}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: cores.borda }}>
        <View style={{ width: `${f * 100}%`, height: "100%", borderRadius: 3, backgroundColor: cores.destaque }} />
      </View>
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: `${f * 100}%`, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: cores.destaque }}
      />
    </View>
  );
}
