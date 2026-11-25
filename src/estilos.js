// Cores e estilos do app. O tema (claro/escuro) segue o do sistema.
import { useMemo } from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";

export const CORES = {
  claro: {
    escuro: false,
    fundo: "#f6f7f9",
    superficie: "#ffffff",
    texto: "#1d2129",
    textoSuave: "#5b6270",
    borda: "#d9dde3",
    destaque: "#2f5bd3",
    sobreDestaque: "#ffffff",
    certo: "#1f7a3f",
    certoFundo: "#e6f4ea",
    errado: "#b3261e",
    erradoFundo: "#fbe9e7",
    aviso: "#8a5a00",
    avisoFundo: "#fff4d6",
  },
  escuro: {
    escuro: true,
    fundo: "#14161a",
    superficie: "#1d2026",
    texto: "#e6e8eb",
    textoSuave: "#a0a6b1",
    borda: "#343842",
    destaque: "#7c9bff",
    sobreDestaque: "#0b1a45",
    certo: "#6fcf8f",
    certoFundo: "#16301f",
    errado: "#ff8a80",
    erradoFundo: "#3a1a18",
    aviso: "#ffd27a",
    avisoFundo: "#3a2e12",
  },
};

export const FONTE_CODIGO = Platform.select({ ios: "Menlo", default: "monospace" });

export function useEstilos() {
  const tema = useColorScheme() === "dark" ? "escuro" : "claro";
  return useMemo(() => {
    const cores = CORES[tema];
    return { cores, e: criarEstilos(cores) };
  }, [tema]);
}

function criarEstilos(c) {
  const cartao = { backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borda, borderRadius: 10, padding: 16 };
  return StyleSheet.create({
    app: { flex: 1, backgroundColor: c.fundo },
    pagina: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, width: "100%", maxWidth: 760, alignSelf: "center" },
    barra: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.borda, backgroundColor: c.superficie },
    barraTitulo: { flex: 1, color: c.texto, fontSize: 18, fontWeight: "700" },
    titulo: { color: c.texto, fontSize: 22, fontWeight: "700", marginBottom: 6 },
    subtitulo: { color: c.texto, fontSize: 17, fontWeight: "700", marginTop: 18, marginBottom: 8 },
    texto: { color: c.texto, fontSize: 16, lineHeight: 24 },
    textoSuave: { color: c.textoSuave, fontSize: 14, lineHeight: 20 },
    rotulo: { color: c.textoSuave, fontSize: 13, fontWeight: "600", marginBottom: 4, marginTop: 10 },
    cartao,
    cartaoToque: { ...cartao, marginBottom: 10 },
    linha: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    campo: { borderWidth: 1, borderColor: c.borda, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: c.texto, backgroundColor: c.superficie, fontSize: 16 },
    campoNotas: { borderWidth: 1, borderColor: c.borda, borderRadius: 8, padding: 12, color: c.texto, backgroundColor: c.superficie, fontSize: 16, fontFamily: FONTE_CODIGO, minHeight: 150, textAlignVertical: "top" },
    botao: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.destaque, minHeight: 48 },
    botaoTexto: { color: c.sobreDestaque, fontSize: 16, fontWeight: "700" },
    botaoSecundario: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.destaque, minHeight: 48 },
    botaoSecundarioTexto: { color: c.destaque, fontSize: 16, fontWeight: "600" },
    chip: { borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: c.borda, backgroundColor: c.superficie, minHeight: 40, justifyContent: "center" },
    chipAtivo: { backgroundColor: c.destaque, borderColor: c.destaque },
    chipTexto: { color: c.texto, fontSize: 15 },
    chipTextoAtivo: { color: c.sobreDestaque, fontWeight: "700" },
    erro: { backgroundColor: c.erradoFundo, borderRadius: 8, padding: 12, marginTop: 10 },
    erroTexto: { color: c.errado, fontSize: 15, lineHeight: 22 },
    aviso: { backgroundColor: c.avisoFundo, borderRadius: 8, padding: 12, marginTop: 10 },
    avisoTexto: { color: c.aviso, fontSize: 15, lineHeight: 22 },
    ok: { backgroundColor: c.certoFundo, borderRadius: 8, padding: 12, marginTop: 10 },
    okTexto: { color: c.certo, fontSize: 15 },
  });
}
