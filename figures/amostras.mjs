import { gradePlaquetas } from "../lib/abertura.mjs";

// Brilho relativo de cada tom da grade da abertura, aplicado ao tom base da amostra.
const FATOR = { "#C9896A": 1.08, "#B65E3C": 1.0, "#8E4529": 0.9, "#A85D3A": 0.96 };

function variar(hex, fator) {
  const canal = (i) => Math.min(255, Math.round(parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) * fator));
  return "#" + [0, 1, 2].map((i) => canal(i).toString(16).padStart(2, "0")).join("").toUpperCase();
}

const r = (n) => Math.round(n * 100) / 100;

// Parede em aparelho corrido que sangra além do viewBox (cols 14 / rows 19 cobrem 480x300 nas duas paridades de fileira; peça na proporção 19 : 7,5).
// Argamassa = fundo da página aparecendo pelas juntas.
export function amostraSvg(tomBase, rotulo) {
  const alt = 13.4;
  const pecas = gradePlaquetas({ cols: 14, rows: 19, larg: 34, alt, gap: 3, x0: -23.5, y0: 300 - alt });
  const rects = pecas.map((p) =>
    `<rect x="${r(p.x)}" y="${r(p.y)}" width="${p.w}" height="${p.h}" fill="${variar(tomBase, FATOR[p.tom])}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-label="Parede de plaqueta, tom ${rotulo}">${rects}</svg>`;
}
