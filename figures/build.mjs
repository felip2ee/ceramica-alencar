// Gera figures/out/figures.js a partir do símbolo da logo. Uso: node site/figures/build.mjs
// Lê o símbolo versionado em site/assets/logo/.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ISO_CSS } from "./kit/iso-kit.mjs";
import { casa } from "./casa.mjs";
import { caminhao } from "./caminhao.mjs";
import mapaTO from "./mapa-to.json" with { type: "json" };

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..");
const svg = readFileSync(join(raiz, "site/assets/logo/alencar-simbolo-terracota-transparente.svg"), "utf8");

const paths = (svg.match(/<(?:ns0:)?path\b[^>]*\/>/g) ?? [])
  .map((p) => p.replace(/ xmlns:ns0="[^"]*"/, "").replace(/ fill="currentColor"/, "").replace(/ns0:/g, ""));
if (paths.length !== 4) throw new Error(`esperava 4 paths no símbolo, achei ${paths.length}`);
const LOGO_PATHS = paths.join("\n");

const viewBox = svg.match(/viewBox="([^"]+)"/)[1];

// Tokens da marca: um só :root, sem tema claro/escuro, sem --anatomy-lift / --anatomy-mono.
const TOKENS_MARCA = `:root{
  --anatomy-paper:#FAF8F1;--anatomy-face:#F0E8DA;--anatomy-top:#F6F0E4;
  --anatomy-shade-0:#C9BBA6;--anatomy-shade-1:#D8CCB8;--anatomy-shade-2:#E4DAC8;--anatomy-shade-3:#EDE4D4;
  --anatomy-lit-top:#FBF6EC;--anatomy-lit-shade:#E8DECC;
  --anatomy-hi:#5A3423;--anatomy-mid:#8E6B52;--anatomy-lo:#BFAE98;--anatomy-faint:#DDD2C0;--anatomy-lit:#D93612;
  --anatomy-halo:#5A3423;--anatomy-halo-opacity:.18;--anatomy-dot:#5A3423;
  --anatomy-red:#D93612;--anatomy-green:#4F7A4A;--anatomy-blue:#3E5C7A;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
}`;

function isoCssMarca(css) {
  const blocos = css.match(/\.iso\{[^}]*\}\s*\.iso\[data-theme="light"\]\{[^}]*\}/);
  if (!blocos) throw new Error("kit: blocos de tokens .iso não encontrados");
  return css
    .replace(blocos[0], TOKENS_MARCA)
    .split("\n")
    .filter((l) => !/\.iso-card|\.iso-plate/.test(l) && !/^@media \(max-width:560px\)\{\.iso-plate/.test(l))
    .join("\n")
    .replace("font-family:var(--anatomy-mono);", "")
    .trim();
}

function escreverFigures(mapa) {
  mkdirSync(join(aqui, "out"), { recursive: true });
  const linhas = Object.entries(mapa).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`);
  writeFileSync(join(aqui, "out/figures.js"), linhas.join("\n") + "\n");
}

const CASA = casa();
const CAMINHAO = caminhao(mapaTO);
// Retrato para a célula de tela cheia do celular: o chão gira para a rota descer a tela, a câmera sobe para 40°
// (a 24° a rota em profundidade encurtaria demais) e o enquadramento é pela rota, não pelo estado inteiro.
const CAMINHAO_RETRATO = caminhao(mapaTO, { largura: 720, altura: 1440, giro: -20, elevacao: 40, escala: 1.6, grupoAltura: 0.84, centroY: 0.54, enquadrar: "rota" });

escreverFigures({
  LOGO_VIEWBOX: viewBox,
  LOGO_PATHS,
  ISO_CSS_MARCA: isoCssMarca(ISO_CSS),
  CASA: CASA.svg,
  CASA_META: CASA.meta,
  CAMINHAO: CAMINHAO.svg,
  CAMINHAO_META: CAMINHAO.meta,
  CAMINHAO_RETRATO: CAMINHAO_RETRATO.svg,
  CAMINHAO_RETRATO_META: CAMINHAO_RETRATO.meta,
});
