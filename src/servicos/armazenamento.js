// Arquivos do app: catálogo, textos, áudios baixados e progresso de cada aula.
// Tudo fica em Paths.document (apagado só ao desinstalar ou limpar os dados do app).
import { Directory, File, Paths } from "expo-file-system";
import catalogoEmbutido from "../catalogo.json";

export const REPOSITORIO = "jooemanoel/estudos";
export const TAG = "audioaulas";
export const URL_BASE = `https://github.com/${REPOSITORIO}/releases/download/${TAG}`;

const pastaAulas = new Directory(Paths.document, "aulas");
const arquivoCatalogo = new File(Paths.document, "catalogo.json");
const arquivoProgresso = new File(Paths.document, "progresso.json");

function garantirPasta() {
  if (!pastaAulas.exists) pastaAulas.create({ intermediates: true });
}

function lerJSON(arquivo, padrao) {
  try {
    return arquivo.exists ? JSON.parse(arquivo.textSync()) : padrao;
  } catch {
    return padrao;
  }
}

function gravarJSON(arquivo, dados) {
  if (!arquivo.exists) arquivo.create({ intermediates: true });
  arquivo.write(JSON.stringify(dados));
}

// ---------- Catálogo ----------

/** Catálogo salvo da última atualização, ou o que veio junto com o app (o mais novo dos dois). */
export function catalogoLocal() {
  const salvo = lerJSON(arquivoCatalogo, null);
  if (salvo?.aulas && salvo.versao >= catalogoEmbutido.versao) return salvo;
  return catalogoEmbutido;
}

/** Busca o catalogo.json da release. Lança erro se estiver sem internet. */
export async function atualizarCatalogo() {
  const resposta = await fetch(`${URL_BASE}/catalogo.json?t=${Date.now()}`, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`Não consegui buscar a lista de aulas (HTTP ${resposta.status}).`);
  const catalogo = await resposta.json();
  if (!Array.isArray(catalogo?.aulas)) throw new Error("A lista de aulas recebida é inválida.");
  gravarJSON(arquivoCatalogo, catalogo);
  return catalogo;
}

// ---------- Áudios ----------

function arquivoAudio(aula) {
  return new File(pastaAulas, aula.mp3);
}

/** "baixada", "desatualizada" (o MP3 publicado mudou) ou "ausente". */
export function situacaoAudio(aula) {
  if (!aula.mp3) return "ausente";
  const f = arquivoAudio(aula);
  if (!f.exists) return "ausente";
  return aula.mp3Bytes && f.size !== aula.mp3Bytes ? "desatualizada" : "baixada";
}

export function uriAudio(aula) {
  return arquivoAudio(aula).uri;
}

/** Baixa o MP3 da aula. onProgresso(0..1). Cancelável com um AbortSignal. */
export async function baixarAudio(aula, onProgresso, signal) {
  garantirPasta();
  const destino = arquivoAudio(aula);
  await File.downloadFileAsync(`${URL_BASE}/${aula.mp3}`, destino, {
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten, totalBytes }) => {
      const total = totalBytes > 0 ? totalBytes : aula.mp3Bytes;
      if (total > 0) onProgresso?.(Math.min(1, bytesWritten / total));
    },
  });
}

export function excluirAudio(aula) {
  const f = arquivoAudio(aula);
  if (f.exists) f.delete();
}

/** Espaço ocupado pelos áudios baixados, em bytes. */
export function espacoUsado() {
  if (!pastaAulas.exists) return 0;
  return pastaAulas
    .list()
    .filter((i) => i instanceof File && i.name.endsWith(".mp3"))
    .reduce((soma, f) => soma + (f.size ?? 0), 0);
}

// ---------- Textos ----------

/** Texto da aula: do disco se já baixado, senão da release (e guarda para ler offline). */
export async function textoDaAula(aula) {
  garantirPasta();
  const f = new File(pastaAulas, aula.txt);
  if (f.exists) return f.text();
  const resposta = await fetch(`${URL_BASE}/${aula.txt}`);
  if (!resposta.ok) throw new Error(`Não consegui baixar o texto da aula (HTTP ${resposta.status}).`);
  const texto = await resposta.text();
  f.create({ overwrite: true });
  f.write(texto);
  return texto;
}

// ---------- Progresso ----------
// { aulas: { [id]: { posicao, total, concluida, paragrafo, atualizadoEm } }, ultima, velocidade }

export function lerProgresso() {
  const p = lerJSON(arquivoProgresso, {});
  return { aulas: {}, ultima: null, velocidade: 1, ...p };
}

export function gravarProgresso(progresso) {
  gravarJSON(arquivoProgresso, progresso);
}
