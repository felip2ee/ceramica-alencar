// Gera figures/out/figures.js a partir do kit da logo. Uso: node site/figures/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..");
const svg = readFileSync(join(raiz, "Ceramica_Alencar_Kit_Web/simbolo/alencar-simbolo-terracota-transparente.svg"), "utf8");

const LOGO_PATHS = (svg.match(/<ns0:path\b[^>]*\/>/g) ?? [])
  .map((p) => p.replace(/ xmlns:ns0="[^"]*"/, "").replace(/ fill="currentColor"/, "").replace(/ns0:/g, ""))
  .join("\n");

const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
mkdirSync(join(aqui, "out"), { recursive: true });
writeFileSync(
  join(aqui, "out/figures.js"),
  `export const LOGO_VIEWBOX = ${JSON.stringify(viewBox)};\nexport const LOGO_PATHS = \`${LOGO_PATHS}\`;\n`,
);
