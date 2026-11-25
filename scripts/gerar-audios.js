// Gera os MP3 das audioaulas a partir dos TXT, com a voz neural pt-BR-AntonioNeural
// (a mesma "Antonio - BR" do text-to-speech.online), pelo serviço de leitura em voz alta
// do Microsoft Edge. Não é uma API oficial: não exige chave, mas pode mudar sem aviso.
//
// Uso:
//   npm run gerar-audios                     gera só os MP3 ausentes ou mais antigos que o TXT
//   npm run gerar-audios -- 1.4.4            só as aulas cujo nome contém "1.4.4"
//   npm run gerar-audios -- --forcar 1.1     regenera mesmo que o MP3 esteja em dia
//   npm run gerar-audios -- --pasta <dir>    outra pasta de aulas (padrão: ../estudos/aulas)
//
// O áudio sai em MP3 mono, 24 kHz, 48 kbps, o mesmo formato dos arquivos atuais.
// Depois, rode npm run publicar-aulas para enviar os arquivos novos.
const { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

const VOZ = "pt-BR-AntonioNeural";
const FORMATO = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
const LIMITE_TRECHO = 2500; // caracteres por requisição
const TENTATIVAS = 4;

const args = process.argv.slice(2);
const forcar = args.includes("--forcar");
const iPasta = args.indexOf("--pasta");
const pasta = resolve(iPasta >= 0 ? args[iPasta + 1] : join(__dirname, "../../estudos/aulas"));
const filtros = args.filter((a, i) => !a.startsWith("--") && (iPasta < 0 || i !== iPasta + 1));

const escaparXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// Divide o texto em trechos de até LIMITE_TRECHO caracteres, sem cortar parágrafos
// (e, se um parágrafo for longo demais, sem cortar frases).
function dividir(texto) {
  const partes = texto
    .split(/\r?\n\s*\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean)
    .flatMap((p) => (p.length <= LIMITE_TRECHO ? [p] : p.match(/[^.!?]+[.!?]+["”]?\s*|[^.!?]+$/g).map((f) => f.trim())));
  const trechos = [];
  let atual = "";
  for (const p of partes) {
    if (atual && atual.length + p.length + 2 > LIMITE_TRECHO) {
      trechos.push(atual);
      atual = "";
    }
    // Linha em branco vira pausa: termina com ponto o que não termina (títulos).
    const frase = /[.!?:;"”]$/.test(p) ? p : p + ".";
    atual = atual ? `${atual}\n\n${frase}` : frase;
  }
  if (atual) trechos.push(atual);
  return trechos;
}

let tts = null;
async function conectar() {
  if (tts) tts.close();
  tts = new MsEdgeTTS({ connectionTimeoutMs: 20000, synthesisTimeoutMs: 120000 });
  await tts.setMetadata(VOZ, FORMATO);
}

function sintetizar(texto) {
  return new Promise((ok, falha) => {
    const { audioStream } = tts.toStream(escaparXml(texto));
    const pedacos = [];
    audioStream.on("data", (d) => pedacos.push(d));
    audioStream.on("error", falha);
    audioStream.on("close", () => {
      const audio = Buffer.concat(pedacos);
      if (audio.length) ok(audio);
      else falha(new Error("nenhum áudio recebido"));
    });
  });
}

async function sintetizarComRetentativa(texto) {
  for (let t = 1; ; t++) {
    try {
      if (!tts) await conectar();
      return await sintetizar(texto);
    } catch (erro) {
      if (t >= TENTATIVAS) throw erro;
      console.log(`    falhou (${erro.message}); nova tentativa ${t + 1}/${TENTATIVAS}`);
      await new Promise((r) => setTimeout(r, 3000 * t));
      tts = null;
    }
  }
}

async function main() {
  const txts = readdirSync(pasta)
    .filter((f) => /^aula_.*\.txt$/.test(f))
    .filter((f) => !filtros.length || filtros.some((x) => f.includes(x)))
    .sort();
  const pendentes = txts.filter((f) => {
    const mp3 = join(pasta, f.replace(/\.txt$/, ".mp3"));
    return forcar || !existsSync(mp3) || statSync(mp3).mtimeMs < statSync(join(pasta, f)).mtimeMs;
  });
  console.log(`${txts.length} aula(s) selecionada(s); ${pendentes.length} para gerar. Voz: ${VOZ}.`);

  for (const [n, f] of pendentes.entries()) {
    const inicio = Date.now();
    const trechos = dividir(readFileSync(join(pasta, f), "utf8"));
    console.log(`[${n + 1}/${pendentes.length}] ${f} (${trechos.length} trechos)`);
    const audios = [];
    for (const [i, trecho] of trechos.entries()) {
      audios.push(await sintetizarComRetentativa(trecho));
      process.stdout.write(`\r    trecho ${i + 1}/${trechos.length}`);
    }
    // Quadros MP3 do mesmo formato podem ser concatenados diretamente.
    const destino = join(pasta, f.replace(/\.txt$/, ".mp3"));
    writeFileSync(destino + ".tmp", Buffer.concat(audios));
    renameSync(destino + ".tmp", destino);
    const mb = (statSync(destino).size / 1e6).toFixed(1);
    console.log(`\r    ok: ${mb} MB em ${Math.round((Date.now() - inicio) / 1000)} s`);
  }
  if (tts) tts.close();
}

main().catch((erro) => {
  console.error(`\nErro: ${erro.message}`);
  if (tts) tts.close();
  process.exit(1);
});
