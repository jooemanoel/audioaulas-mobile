// Funções puras (sem React Native): formatação, parágrafos para a leitura em voz e
// organização do catálogo. Testadas em test/formatos.test.js.

/** 3725 → "1:02:05"; 125 → "2:05" */
export function formatarTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 19293120 → "19 MB" */
export function formatarBytes(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / 1e6;
  return mb >= 1000 ? `${(mb / 1000).toFixed(1).replace(".", ",")} GB` : `${Math.max(1, Math.round(mb))} MB`;
}

/** "1.4.1" + parte 2 → "1.4.1 · parte 2" */
export function rotuloItem(aula) {
  return aula.parte ? `${aula.item} · parte ${aula.parte}` : aula.item;
}

/**
 * Divide o texto da aula em parágrafos para a leitura em voz. Parágrafos maiores que
 * `limite` (o Android aceita ~4000 caracteres por fala) são quebrados nas frases.
 */
export function paragrafos(texto, limite = 3000) {
  const blocos = texto
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const saida = [];
  for (const bloco of blocos) {
    if (bloco.length <= limite) {
      saida.push(bloco);
      continue;
    }
    let atual = "";
    for (const frase of bloco.match(/[^.!?]+[.!?]*\s*/g) ?? [bloco]) {
      if (atual && atual.length + frase.length > limite) {
        saida.push(atual.trim());
        atual = "";
      }
      // Frase sozinha maior que o limite: corta no espaço mais próximo.
      let f = frase;
      while (f.length > limite) {
        const corte = f.lastIndexOf(" ", limite) > 0 ? f.lastIndexOf(" ", limite) : limite;
        saida.push(f.slice(0, corte).trim());
        f = f.slice(corte);
      }
      atual += f;
    }
    if (atual.trim()) saida.push(atual.trim());
  }
  return saida;
}

/** Agrupa as aulas por seção ("1.1", "1.2"...), na ordem do catálogo. */
export function agruparPorSecao(catalogo) {
  const grupos = [];
  for (const aula of catalogo.aulas) {
    let g = grupos[grupos.length - 1];
    if (!g || g.secao !== aula.secao) {
      g = {
        secao: aula.secao,
        titulo: catalogo.grupos[aula.secao] ?? `Item ${aula.secao}`,
        modulo: aula.modulo,
        tituloModulo: catalogo.grupos[aula.modulo] ?? `Módulo ${aula.modulo}`,
        aulas: [],
      };
      grupos.push(g);
    }
    g.aulas.push(aula);
  }
  return grupos;
}

/**
 * Fração ouvida (0 a 1) a partir do progresso salvo. Áudio grava { modo: "audio", posicao, total }
 * em segundos; a voz do aparelho grava { modo: "voz", paragrafo, paragrafos }.
 */
export function fracaoOuvida(p) {
  if (!p) return 0;
  if (p.concluida) return 1;
  if (p.modo === "voz") return p.paragrafos > 0 ? Math.min(1, (p.paragrafo || 0) / p.paragrafos) : 0;
  return p.total > 0 ? Math.min(1, (p.posicao || 0) / p.total) : 0;
}
