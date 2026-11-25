// Gera o catálogo das audioaulas (src/catalogo.json) a partir da pasta de aulas do
// repositório "estudos" e dos títulos do conteudo.md.
//
// Uso: npm run catalogo [-- <pasta das aulas> <conteudo.md>]
// Padrão: ../estudos/aulas e ../estudos/conteudo.md
//
// Cada aula é um TXT "aula_<item>_<nome>[_parteN][_roteiro_audio].txt". Se existir um MP3
// com o mesmo nome, a aula tem áudio; senão, o app lê o texto com a voz do aparelho.
const { existsSync, readdirSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const RAIZ = resolve(__dirname, "..");
const PADRAO_AULAS = resolve(RAIZ, "../estudos/aulas");
const PADRAO_CONTEUDO = resolve(RAIZ, "../estudos/conteudo.md");
const DESTINO = join(RAIZ, "src/catalogo.json");

const NOME_AULA = /^aula_(\d+\.\d+\.\d+)_(.+)\.txt$/;

/** "ESTADO, DEMOCRACIA E CIÊNCIA POLÍTICA:" → "Estado, democracia e ciência política" */
function frase(texto) {
  // "CONHECIMENTOS ESPECÍFICOS - CARGO 4: ..." fica só com a parte antes do traço.
  const t = texto.split(/\s[-–]\s/)[0].trim().replace(/[:.]+$/, "").trim();
  const minusculo = t === t.toUpperCase() ? t.toLocaleLowerCase("pt-BR") : t;
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}

/** Lê "# 1 ...", "## 1.1 ..." e "### 1.1.1 ..." do conteudo.md: { "1": "...", "1.1": "...", "1.1.1": "..." } */
function lerTitulos(markdown) {
  const titulos = {};
  for (const linha of markdown.split(/\r?\n/)) {
    const m = /^#{1,3}\s+(\d+(?:\.\d+){0,2})\s+(.+)$/.exec(linha);
    if (m) titulos[m[1]] = frase(m[2]);
  }
  return titulos;
}

/** Interpreta o nome do arquivo de uma aula, ou null se não for uma aula. */
function lerNome(arquivo) {
  const m = NOME_AULA.exec(arquivo);
  if (!m) return null;
  const item = m[1];
  let resto = m[2].replace(/_roteiro_audio$/, "");
  let parte = null;
  const p = /_parte(\d+)$/.exec(resto);
  if (p) {
    parte = Number(p[1]);
    resto = resto.slice(0, p.index);
  }
  return { item, parte, nome: resto };
}

/** Ordena "1.10.2" depois de "1.9.1" e as partes em sequência. */
function comparar(a, b) {
  const pa = a.item.split(".").map(Number);
  const pb = b.item.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return (a.parte ?? 0) - (b.parte ?? 0);
}

function gerarCatalogo(pastaAulas, markdown) {
  const titulos = lerTitulos(markdown);
  const arquivos = readdirSync(pastaAulas);
  const aulas = [];
  for (const txt of arquivos) {
    const info = lerNome(txt);
    if (!info) continue;
    const base = txt.slice(0, -4);
    const mp3 = `${base}.mp3`;
    const temMp3 = arquivos.includes(mp3);
    const [modulo, secao] = [info.item.split(".")[0], info.item.split(".").slice(0, 2).join(".")];
    aulas.push({
      id: base,
      item: info.item,
      parte: info.parte,
      titulo: titulos[info.item] ?? frase(info.nome.replace(/_/g, " ")),
      modulo,
      secao,
      txt,
      mp3: temMp3 ? mp3 : null,
      mp3Bytes: temMp3 ? statSync(join(pastaAulas, mp3)).size : 0,
    });
  }
  aulas.sort(comparar);
  const usados = new Set(aulas.flatMap((a) => [a.modulo, a.secao]));
  const grupos = Object.fromEntries([...usados].sort().map((k) => [k, titulos[k] ?? `Item ${k}`]));
  return { versao: new Date().toISOString(), grupos, aulas };
}

module.exports = { frase, lerTitulos, lerNome, comparar, gerarCatalogo };

if (require.main === module) {
  const pastaAulas = resolve(process.argv[2] ?? PADRAO_AULAS);
  const conteudo = resolve(process.argv[3] ?? PADRAO_CONTEUDO);
  if (!existsSync(pastaAulas)) throw new Error(`Pasta de aulas não encontrada: ${pastaAulas}`);
  const markdown = existsSync(conteudo) ? readFileSync(conteudo, "utf8") : "";
  const catalogo = gerarCatalogo(pastaAulas, markdown);
  writeFileSync(DESTINO, JSON.stringify(catalogo, null, 2) + "\n");
  const comAudio = catalogo.aulas.filter((a) => a.mp3).length;
  console.log(`Catálogo: ${catalogo.aulas.length} aulas (${comAudio} com áudio) → src/catalogo.json`);
}
