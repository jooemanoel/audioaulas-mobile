import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { frase, gerarCatalogo, lerNome, lerTitulos } = require("../scripts/catalogo.js");

test("lerNome entende item, parte e sufixo _roteiro_audio", () => {
  assert.deepEqual(lerNome("aula_1.1.1_estado_e_legitimidade_roteiro_audio.txt"), { item: "1.1.1", parte: null, nome: "estado_e_legitimidade" });
  assert.deepEqual(lerNome("aula_1.4.1_organizacao_administrativa_parte2_roteiro_audio.txt"), { item: "1.4.1", parte: 2, nome: "organizacao_administrativa" });
  assert.deepEqual(lerNome("aula_3.1.1_problemas_e_requisitos.txt"), { item: "3.1.1", parte: null, nome: "problemas_e_requisitos" });
  assert.equal(lerNome("aula_1.1.1_x.mp3"), null);
  assert.equal(lerNome("Aula 3.1.1 – Problemas.txt"), null);
});

test("frase e lerTitulos", () => {
  assert.equal(frase("ESTADO, DEMOCRACIA E CIÊNCIA POLÍTICA:"), "Estado, democracia e ciência política");
  assert.equal(frase("CONHECIMENTOS ESPECÍFICOS - CARGO 4: AFFC"), "Conhecimentos específicos");
  assert.equal(frase("Estado e legitimidade."), "Estado e legitimidade");
  const t = lerTitulos("# 1 CONHECIMENTOS BÁSICOS\n\n## 1.1 ESTADO:\n\n### 1.1.1 Estado e legitimidade.\n#### 1.1.1.1 ignorado");
  assert.deepEqual(t, { 1: "Conhecimentos básicos", "1.1": "Estado", "1.1.1": "Estado e legitimidade" });
});

test("gerarCatalogo ordena, liga TXT ao MP3 e marca aulas sem áudio", () => {
  const pasta = mkdtempSync(join(tmpdir(), "aulas-"));
  try {
    for (const nome of [
      "aula_1.10.1_dez_roteiro_audio.txt",
      "aula_1.2.1_dois_roteiro_audio.txt",
      "aula_1.2.1_dois_roteiro_audio.mp3",
      "aula_1.4.1_org_parte2_roteiro_audio.txt",
      "aula_1.4.1_org_parte1_roteiro_audio.txt",
      "outro.txt",
    ]) {
      writeFileSync(join(pasta, nome), "abc");
    }
    const c = gerarCatalogo(pasta, "### 1.2.1 Fundamentos.\n## 1.2 SOCIEDADE:");
    assert.deepEqual(c.aulas.map((a) => [a.item, a.parte]), [["1.2.1", null], ["1.4.1", 1], ["1.4.1", 2], ["1.10.1", null]]);
    const dois = c.aulas[0];
    assert.equal(dois.titulo, "Fundamentos");
    assert.equal(dois.mp3, "aula_1.2.1_dois_roteiro_audio.mp3");
    assert.equal(dois.mp3Bytes, 3);
    assert.equal(c.aulas[3].mp3, null);
    assert.equal(c.aulas[3].titulo, "Dez");
    assert.equal(c.grupos["1.2"], "Sociedade");
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
