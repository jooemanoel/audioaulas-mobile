import assert from "node:assert/strict";
import { test } from "node:test";
import { agruparPorSecao, formatarBytes, formatarTempo, fracaoOuvida, paragrafos, rotuloItem } from "../src/nucleo/formatos.js";

test("formatarTempo", () => {
  assert.equal(formatarTempo(0), "0:00");
  assert.equal(formatarTempo(125.9), "2:05");
  assert.equal(formatarTempo(3725), "1:02:05");
  assert.equal(formatarTempo(NaN), "0:00");
});

test("formatarBytes", () => {
  assert.equal(formatarBytes(19293120), "19 MB");
  assert.equal(formatarBytes(451e6), "451 MB");
  assert.equal(formatarBytes(1.25e9), "1,3 GB");
  assert.equal(formatarBytes(0), "0 MB");
});

test("rotuloItem com e sem parte", () => {
  assert.equal(rotuloItem({ item: "1.1.1", parte: null }), "1.1.1");
  assert.equal(rotuloItem({ item: "1.4.1", parte: 2 }), "1.4.1 · parte 2");
});

test("paragrafos junta linhas e separa por linha em branco", () => {
  assert.deepEqual(paragrafos("TÍTULO\nlinha dois\n\n\nSegundo.\r\n\r\nTerceiro."), ["TÍTULO linha dois", "Segundo.", "Terceiro."]);
});

test("paragrafos quebra blocos longos nas frases, sem passar do limite", () => {
  const frase = "Esta é uma frase de teste com algumas palavras. ";
  const longo = frase.repeat(200);
  const partes = paragrafos(longo, 500);
  assert.ok(partes.length > 1);
  assert.ok(partes.every((p) => p.length <= 500));
  assert.equal(partes.join(" ").replace(/\s+/g, " "), longo.trim().replace(/\s+/g, " "));
});

test("paragrafos corta frase sozinha maior que o limite", () => {
  const partes = paragrafos("palavra ".repeat(300), 100);
  assert.ok(partes.every((p) => p.length <= 100));
});

test("agruparPorSecao mantém a ordem e usa os títulos do catálogo", () => {
  const catalogo = {
    grupos: { 1: "Básicos", 1.1: "Estado", 1.2: "Sociedade" },
    aulas: [
      { id: "a", item: "1.1.1", secao: "1.1", modulo: "1" },
      { id: "b", item: "1.1.2", secao: "1.1", modulo: "1" },
      { id: "c", item: "1.2.1", secao: "1.2", modulo: "1" },
    ],
  };
  const g = agruparPorSecao(catalogo);
  assert.deepEqual(g.map((x) => [x.secao, x.titulo, x.aulas.length]), [["1.1", "Estado", 2], ["1.2", "Sociedade", 1]]);
  assert.equal(g[0].tituloModulo, "Básicos");
});

test("fracaoOuvida para áudio, voz e concluída", () => {
  assert.equal(fracaoOuvida(undefined), 0);
  assert.equal(fracaoOuvida({ modo: "audio", posicao: 30, total: 120 }), 0.25);
  assert.equal(fracaoOuvida({ modo: "voz", paragrafo: 5, paragrafos: 10 }), 0.5);
  assert.equal(fracaoOuvida({ modo: "voz", paragrafo: 5, paragrafos: 10, concluida: true }), 1);
});
