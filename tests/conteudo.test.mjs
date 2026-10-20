import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("um único h1 com o título editorial", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /O barro também desenha o <em>ambiente\.<\/em>/);
});
test("palavras vetadas ausentes", () => {
  // só o texto visível: a classe/atributo `amostra` dos placeholders de tom é contrato com a Task 4
  const texto = html.replace(/<[^>]*>/g, " ");
  for (const w of [/premium/i, /exclusiv/i, /luxuos/i, /o melhor/i, /amostra/i, /R\$/]) assert.doesNotMatch(texto, w);
  for (const w of [/premium/i, /exclusiv/i, /luxuos/i, /o melhor/i, /R\$/]) assert.doesNotMatch(html, w);
});
test("nome e fatos obrigatórios presentes", () => {
  for (const s of ["Cerâmicas Alencar", "Tocantinópolis", "7 × 24", "3 a 7 dias", "frete próprio", "Conversar sobre meu projeto"]) assert.ok(html.includes(s), s);
});
test("seções na ordem do spec", () => {
  const ids = ["hero","fabrica","materialidade","revestimentos","aplicacoes","parceiros","contato"];
  const pos = ids.map(id => html.indexOf(`id="${id}"`));
  assert.ok(pos.every(p => p > 0));
  assert.deepEqual(pos, [...pos].sort((a,b)=>a-b));
});
test("placeholders da empresa presentes e tokens exatos", () => {
  for (const p of ["WHATSAPP_NUMERO","TOM_CLARO_NOME","TOM_MEDIO_NOME","TOM_ESCURO_NOME","INSTAGRAM_HANDLE","RAZAO_SOCIAL","CNPJ"]) assert.ok(html.includes(p), p);
  for (const t of ["--background:#FAF8F1","--surface:#F0E8DA","--brand:#D93612","--action:#B82E12","--ink:#5A3423","--clay:#B65E3C","--sun:#E7B43D"]) assert.ok(css.replace(/\s/g,"").includes(t), t);
});
test("fontes: só Bodoni Moda e DM Sans", () => {
  assert.doesNotMatch(css, /monospace|Jost|Manrope|Outfit|Archivo|Cormorant/);
});
test("ids e ganchos de interface das tasks seguintes", () => {
  for (const id of ["abertura","casa","plaqueta-narradora","caminhao","galeria","galeria-filtros","whatsapp-flutuante"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.equal((html.match(/<figure[^>]*data-ambiente="[^"]+"[^>]*data-tom="(claro|medio|escuro)"/g) || []).length, 6);
  assert.equal((html.match(/<div class="amostra" data-tom="(claro|medio|escuro)"/g) || []).length, 3);
  assert.ok(html.includes("data-filtro-ambiente") && html.includes("data-filtro-tom"));
  assert.ok(/<script type="module" src="main\.js">/.test(html));
  assert.equal((html.match(/<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/3\.12\.5\//g) || []).length, 3);
});
test("skip link aponta para o main; texto pequeno não usa --clay", () => {
  assert.match(html, /class="pular" href="#conteudo"/);
  assert.match(html, /<main id="conteudo">/);
  assert.doesNotMatch(css.replace(/--clay:[^;]+;/, ""), /color:\s*var\(--clay\)/);
});
