// Publica as aulas (MP3, TXT e catalogo.json) na release "audioaulas" do repositório
// jooemanoel/estudos, de onde o app baixa tudo. Envia só o que é novo ou mudou de tamanho.
//
// Uso: npm run publicar-aulas [-- <pasta das aulas> <conteudo.md>]
// Requer o GitHub CLI (gh) autenticado.
const { execFileSync } = require("node:child_process");
const { readFileSync, statSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { gerarCatalogo } = require("./catalogo");

const REPOSITORIO = "jooemanoel/estudos";
const TAG = "audioaulas";
const RAIZ = resolve(__dirname, "..");

const pastaAulas = resolve(process.argv[2] ?? join(RAIZ, "../estudos/aulas"));
const conteudo = resolve(process.argv[3] ?? join(RAIZ, "../estudos/conteudo.md"));

function gh(args, opcoes = {}) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opcoes });
}

function garantirRelease() {
  try {
    gh(["release", "view", TAG, "-R", REPOSITORIO, "--json", "tagName"], { stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    console.log(`Criando a release "${TAG}" em ${REPOSITORIO}...`);
    gh([
      "release", "create", TAG, "-R", REPOSITORIO,
      "--title", "Audioaulas",
      "--notes", "Arquivos das audioaulas usados pelo app Audioaulas (audioaulas-mobile). Atualizada com `npm run publicar-aulas`.",
      "--latest=false",
    ]);
  }
}

function assetsPublicados() {
  const json = gh(["release", "view", TAG, "-R", REPOSITORIO, "--json", "assets"]);
  return new Map(JSON.parse(json).assets.map((a) => [a.name, a.size]));
}

function enviar(caminhos) {
  // Em lotes, para não estourar o tamanho da linha de comando no Windows.
  for (let i = 0; i < caminhos.length; i += 5) {
    const lote = caminhos.slice(i, i + 5);
    lote.forEach((c) => console.log(`  ↑ ${c.split(/[\\/]/).pop()}`));
    gh(["release", "upload", TAG, "-R", REPOSITORIO, "--clobber", ...lote], { stdio: "inherit" });
  }
}

const catalogo = gerarCatalogo(pastaAulas, readFileSync(conteudo, "utf8"));
const destinoCatalogo = join(RAIZ, "src/catalogo.json");
writeFileSync(destinoCatalogo, JSON.stringify(catalogo, null, 2) + "\n");

garantirRelease();
const publicados = assetsPublicados();
const pendentes = catalogo.aulas
  .flatMap((a) => [a.txt, a.mp3].filter(Boolean))
  .map((nome) => join(pastaAulas, nome))
  .filter((caminho) => publicados.get(caminho.split(/[\\/]/).pop()) !== statSync(caminho).size);

console.log(`${catalogo.aulas.length} aulas no catálogo; ${pendentes.length} arquivo(s) para enviar.`);
enviar(pendentes);
// O catálogo vai por último: o app só enxerga aulas novas quando os arquivos já estão lá.
enviar([destinoCatalogo]);
console.log(`Pronto: https://github.com/${REPOSITORIO}/releases/tag/${TAG}`);
