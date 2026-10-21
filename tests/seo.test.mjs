import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const raiz = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", raiz), "utf8");
const texto = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]*>/g, " ");
const URL_SITE = "https://ceramicaalencar.dgtnova.com/";

test("título, descrição e canonical levam as palavras de busca", () => {
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  assert.match(title, /Alencar/); assert.match(title, /plaquetas? de barro/i); assert.match(title, /revestimentos? rústicos?/i);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.match(desc, /material de construção|revestimento/i); assert.match(desc, /Tocantinópolis/);
  assert.ok(html.includes(`<link rel="canonical" href="${URL_SITE}">`));
  assert.match(html, /<meta property="og:image:width" content="1376">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
});

test("JSON-LD: empresa, produto e perguntas, coerentes com o texto visível", () => {
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.ok(blocos.length >= 1);
  const nos = blocos.flatMap((b) => (b["@graph"] ? b["@graph"] : [b]));
  const empresa = nos.find((n) => /LocalBusiness|Organization/.test(String(n["@type"])));
  assert.equal(empresa.address.addressLocality, "Tocantinópolis");
  assert.equal(empresa.address.addressRegion, "TO");
  assert.match(empresa.telephone, /\+55 ?63/);
  assert.ok(empresa.sameAs.some((u) => u.includes("instagram.com/ceramicaalencar")));
  const produto = nos.find((n) => n["@type"] === "Product");
  assert.match(produto.name, /plaqueta de barro/i);
  assert.ok(!("offers" in produto), "sem preço no schema");
  const faq = nos.find((n) => n["@type"] === "FAQPage");
  assert.ok(faq.mainEntity.length >= 4);
  for (const q of faq.mainEntity) assert.ok(texto.includes(q.name), `pergunta não visível: ${q.name}`);
});

test("seção de perguntas visível, antes do contato, em <details>", () => {
  const i = html.indexOf('id="perguntas"'), j = html.indexOf('id="contato"');
  assert.ok(i > 0 && i < j);
  const sec = html.slice(i, j);
  assert.ok((sec.match(/<details/g) || []).length >= 4);
  assert.match(sec, /apartamento/i);
});

test("robots.txt, sitemap.xml e llms.txt", () => {
  for (const f of ["robots.txt", "sitemap.xml", "llms.txt"]) assert.ok(existsSync(new URL(f, raiz)), f);
  const robots = readFileSync(new URL("robots.txt", raiz), "utf8");
  assert.match(robots, /^User-agent: \*\nAllow: \//m);
  assert.ok(robots.includes(`Sitemap: ${URL_SITE}sitemap.xml`));
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) assert.ok(robots.includes(`User-agent: ${bot}`), bot);
  const sitemap = readFileSync(new URL("sitemap.xml", raiz), "utf8");
  assert.ok(sitemap.includes(`<loc>${URL_SITE}</loc>`));
  const llms = readFileSync(new URL("llms.txt", raiz), "utf8");
  for (const s of ["Tocantinópolis", "7,5 × 19 × 2 cm", "lisa", "queimada", "rústica", "WhatsApp", "revestimentos rústicos", "apartamento"]) assert.ok(llms.includes(s), s);
  assert.doesNotMatch(llms, /R\$|comiss|reserva técnica/);
});

test("nginx entrega .mjs como JavaScript (senão nenhum módulo roda em produção)", () => {
  const conf = readFileSync(new URL("deploy/nginx.conf", raiz), "utf8");
  assert.match(conf, /\\\.mjs\$ \{[\s\S]*?default_type application\/javascript/);
});
