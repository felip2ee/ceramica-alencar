import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../main.js", import.meta.url), "utf8");

test("um único h1 com o título editorial", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1>A parede de barro acolhe a <em>luz\.<\/em><\/h1>/);
});
test("palavras vetadas ausentes", () => {
  // só o texto visível: a classe/atributo `amostra` dos placeholders de tom é contrato com a Task 4
  const texto = html.replace(/<[^>]*>/g, " ");
  for (const w of [/premium/i, /exclusiv/i, /luxuos/i, /o melhor/i, /amostra/i, /R\$/]) assert.doesNotMatch(texto, w);
  for (const w of [/premium/i, /exclusiv/i, /luxuos/i, /o melhor/i, /R\$/]) assert.doesNotMatch(html, w);
});
test("nome e fatos obrigatórios presentes", () => {
  for (const s of ["Cerâmicas Alencar", "Tocantinópolis", "7,5 × 19", "3 a 7 dias", "frete próprio", "Conversar sobre meu projeto"]) assert.ok(html.includes(s), s);
});
test("seções na ordem do spec", () => {
  const ids = ["hero","fabrica","materialidade","revestimentos","aplicacoes","parceiros","contato"];
  const pos = ids.map(id => html.indexOf(`id="${id}"`));
  assert.ok(pos.every(p => p > 0));
  assert.deepEqual(pos, [...pos].sort((a,b)=>a-b));
});
test("placeholders da empresa presentes e tokens exatos", () => {
  for (const p of ["Lisa","Queimada","Rústica"]) assert.ok(html.includes(`<span>${p}</span>`), p);
  for (const t of ["--background:#FAF8F1","--surface:#F0E8DA","--brand:#D93612","--action:#B82E12","--ink:#5A3423","--clay:#B65E3C","--sun:#E7B43D"]) assert.ok(css.replace(/\s/g,"").includes(t), t);
});
test("fontes: só Bodoni Moda e DM Sans", () => {
  assert.doesNotMatch(css, /monospace|Jost|Manrope|Outfit|Archivo|Cormorant/);
});
test("ids e ganchos de interface das tasks seguintes", () => {
  for (const id of ["abertura","casa","plaqueta-narradora","caminhao","galeria","whatsapp-flutuante"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.equal((html.match(/<figure[^>]*data-ambiente="[^"]+"[^>]*data-tom="(lisa|queimada|rustica)"/g) || []).length, 6);
  // lisa e queimada já são foto da peça (assets/kit); a rústica segue vetorial até a foto chegar
  assert.equal((html.match(/<div class="amostra amostra--foto"><img src="assets\/kit\/kit-plaqueta-(lisa|queimada)\.jpg"/g) || []).length, 2);
  assert.equal((html.match(/<div class="amostra" data-tom="rustica"/g) || []).length, 1);
  assert.ok(/<script type="module" src="main\.js">/.test(html));
  assert.equal((html.match(/<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/3\.12\.5\//g) || []).length, 3);
});
test("skip link aponta para o main; texto pequeno não usa --clay", () => {
  assert.match(html, /class="pular" href="#conteudo"/);
  assert.match(html, /<main id="conteudo">/);
  assert.doesNotMatch(css.replace(/--clay:[^;]+;/, ""), /color:\s*var\(--clay\)/);
});
test("acessibilidade estática", () => {
  assert.match(html, /<html lang="pt-BR"/);
  for (const m of html.matchAll(/<img [^>]*>/g)) assert.match(m[0], /alt="/, m[0]);
  assert.match(css, /:focus-visible\{outline:2px solid var\(--action\)/);
  assert.ok(!/<h3/.test(html) || /<h2/.test(html));
  assert.match(html, /#plaqueta-narradora[^>]*aria-hidden="true"|id="plaqueta-narradora"[^>]*aria-hidden="true"/);
});
test("ajustes da Task 8: og:image absoluto, anti-flash, flutuante e áreas de toque", () => {
  assert.match(html, /property="og:image" content="https:\/\/SITE_DOMINIO\/assets\/kit\/kit-acabamentos\.jpg"/);
  assert.ok(html.indexOf('dataset.abertura = "skip"') > 0 && html.indexOf('dataset.abertura = "skip"') < html.indexOf('href="styles.css"'));
  assert.match(css, /html\[data-abertura="skip"\] #abertura\s*\{\s*display:\s*none/);
  assert.match(css, /#whatsapp-flutuante\.is-oculto/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.link\s*\{[^}]*min-height:\s*44px/);
  assert.equal((html.match(/<img [^>]*assets\/(flow|kit)\/[^>]*srcset=/g) || []).length, 10); // 6 da galeria + 4 interlúdios
  assert.equal((html.match(/class="interludio__frase"/g) || []).length, 8); // duas frases por interlúdio
});
test("toda imagem gerada (assets/flow/, assets/kit/) de ambiente vem com a legenda \"imagem conceitual\"", () => {
  const figuras = [...html.matchAll(/<figure[\s\S]*?<\/figure>/g)].map((m) => m[0]);
  const flow = [...html.matchAll(/<img [^>]*src="assets\/(flow|kit)\/[^>]*srcset=[^>]*>/g)]; // fotos de peça (sem srcset) ficam de fora
  const interludios = [...html.matchAll(/<section class="interludio"[\s\S]*?<\/section>/g)].map((m) => m[0]);
  assert.equal(flow.length, 10); // 6 da galeria + 4 interlúdios
  for (const [img] of flow) {
    const fig = figuras.find((f) => f.includes(img));
    if (fig) { assert.match(fig.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? "", /imagem conceitual/, img); continue; }
    const sec = interludios.find((x) => x.includes(img));
    assert.ok(sec, `img sem <figure> nem interlúdio: ${img}`);
    assert.match(sec.match(/interludio__legenda">([\s\S]*?)<\/p>/)?.[1] ?? "", /imagem conceitual/, img);
  }
});
test("materialidade: vídeo em loop, mudo, com a foto como poster e pausado sem movimento", () => {
  const video = html.match(/<video [^>]*id="video-materialidade"[^>]*>/)?.[0] ?? "";
  for (const attr of ["autoplay", "muted", "loop", "playsinline", 'poster="assets/flow/flow-materialidade-1.jpg"', 'aria-label="']) assert.match(video, new RegExp(attr), attr);
  assert.match(html, /<source src="assets\/flow\/flow-materialidade-1\.mp4" type="video\/mp4">/);
  assert.match(html.match(/<figure class="foto[^"]*">[\s\S]*?<\/figure>/)[0], /<figcaption[^>]*>[^<]*conceitual/);
  assert.match(css, /\.foto video/);
  assert.match(js, /video-materialidade[\s\S]*?removeAttribute\("autoplay"\)/);
});
test("pré-carga e botão Pular estático", () => {
  for (const m of ["main.js", "scroll.mjs", "figures/casa-live.mjs", "lib/whatsapp.mjs", "lib/abertura.mjs", "lib/trajeto.mjs", "figures/out/figures.js"]) {
    assert.ok(html.includes(`<link rel="modulepreload" href="${m}">`), m);
  }
  assert.match(html, /<div id="abertura"[^>]*><button class="abertura__pular" type="button">Pular<\/button><\/div>/);
});
