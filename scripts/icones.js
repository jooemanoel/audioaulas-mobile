// Gera os ícones do app a partir do símbolo "headphones" do Material Symbols (Google).
// Uso: npm run icones   (grava em assets/)
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const sharp = require("sharp");

const COR_FUNDO = "#2f5bd3"; // mesma cor de destaque do tema
const COR_SIMBOLO = "#ffffff";

// Desenho original do símbolo (viewBox 0 -960 960 960).
const SIMBOLO =
  "M360-120H200q-33 0-56.5-23.5T120-200v-280q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480v280q0 33-23.5 56.5T760-120H600v-320h160v-40q0-117-81.5-198.5T480-760q-117 0-198.5 81.5T200-480v40h160v320Z";

/**
 * @param tamanho   lado em pixels
 * @param proporcao fração do lado ocupada pelo símbolo
 * @param fundo     cor do fundo ou null (transparente)
 * @param cantos    raio dos cantos do fundo
 * @param cor       cor do símbolo
 */
function svg(tamanho, proporcao, fundo, cantos = 0, cor = COR_SIMBOLO) {
  const lado = tamanho * proporcao;
  const margem = (tamanho - lado) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 ${tamanho} ${tamanho}">
  ${fundo ? `<rect width="${tamanho}" height="${tamanho}" rx="${cantos}" fill="${fundo}"/>` : ""}
  <svg x="${margem}" y="${margem}" width="${lado}" height="${lado}" viewBox="0 -960 960 960">
    <path d="${SIMBOLO}" fill="${cor}"/>
  </svg>
</svg>`;
}

const ICONES = {
  // Ícone geral (iOS / lojas): quadrado cheio, o sistema arredonda.
  "icon.png": svg(1024, 0.6, COR_FUNDO),
  // Ícone adaptativo do Android: só ~66% central fica sempre visível.
  "android-icon-foreground.png": svg(1024, 0.42, null),
  "android-icon-background.png": svg(1024, 0, COR_FUNDO),
  "android-icon-monochrome.png": svg(1024, 0.42, null, 0, "#000000"),
  // Splash: símbolo branco sobre o fundo azul (definido no app.json).
  "splash-icon.png": svg(512, 0.9, null),
  "favicon.png": svg(48, 0.72, COR_FUNDO, 10),
};

(async () => {
  for (const [nome, conteudo] of Object.entries(ICONES)) {
    const destino = join(__dirname, "../assets", nome);
    writeFileSync(destino, await sharp(Buffer.from(conteudo)).png().toBuffer());
    console.log(`Gerado assets/${nome}`);
  }
})();
