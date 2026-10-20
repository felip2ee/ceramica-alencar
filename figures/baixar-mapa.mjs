// Baixa a malha do Tocantins (IBGE), simplifica e grava mapa-to.json. Roda só à mão: node site/figures/baixar-mapa.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL_IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/17?formato=application/vnd.geo+json&qualidade=minima";
const MAX_PONTOS = 400;
const CIDADES = { tocantinopolis: [-47.4224, -6.3245], palmas: [-48.3336, -10.1840] };

const area = (anel) => Math.abs(anel.reduce((s, [x1, y1], i) => {
  const [x2, y2] = anel[(i + 1) % anel.length];
  return s + x1 * y2 - x2 * y1;
}, 0) / 2);

function distSegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function douglasPeucker(pts, tol) {
  if (pts.length < 3) return pts;
  let maior = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distSegmento(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maior) { maior = d; idx = i; }
  }
  if (maior <= tol) return [pts[0], pts[pts.length - 1]];
  return [...douglasPeucker(pts.slice(0, idx + 1), tol).slice(0, -1), ...douglasPeucker(pts.slice(idx), tol)];
}

const resp = await fetch(URL_IBGE);
if (!resp.ok) throw new Error(`IBGE respondeu ${resp.status}`);
const geo = await resp.json();
const { type, coordinates } = geo.features[0].geometry;
const aneis = type === "MultiPolygon" ? coordinates.map((poligono) => poligono[0]) : [coordinates[0]];
let anel = aneis.reduce((a, b) => (area(b) > area(a) ? b : a));
if (anel.length > 1 && anel[0][0] === anel.at(-1)[0] && anel[0][1] === anel.at(-1)[1]) anel = anel.slice(0, -1);

let tol = 0.02;
let simples = douglasPeucker([...anel, anel[0]], tol).slice(0, -1);
while (simples.length > MAX_PONTOS) simples = douglasPeucker([...anel, anel[0]], (tol *= 1.5)).slice(0, -1);
const r4 = (n) => Math.round(n * 1e4) / 1e4;

const destino = join(dirname(fileURLToPath(import.meta.url)), "mapa-to.json");
writeFileSync(destino, JSON.stringify({ anel: simples.map(([x, y]) => [r4(x), r4(y)]), cidades: CIDADES }) + "\n");
console.log(`${anel.length} → ${simples.length} pontos (tolerância ${tol.toFixed(3)}°) em ${destino}`);
