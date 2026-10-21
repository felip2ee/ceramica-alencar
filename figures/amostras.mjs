import { gradePlaquetas } from "../lib/abertura.mjs";
import { mulberry32, sorteiaTom } from "./casa.mjs";

// Tom de queima por peça, como na casa: 65 % base, 25 % um pouco mais claro, 10 % um pouco mais escuro.
const FATOR_TOM = [1, 1.07, 0.9];

function variar(hex, fator) {
  const canal = (i) => Math.min(255, Math.round(parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) * fator));
  return "#" + [0, 1, 2].map((i) => canal(i).toString(16).padStart(2, "0")).join("").toUpperCase();
}

const r = (n) => Math.round(n * 10) / 10;

// Parede em aparelho corrido que sangra além do viewBox (cols 14 / rows 19 cobrem 480x300 nas duas paridades de fileira; peça na proporção 19 : 7,5).
// Barro, não botão: sem sombra projetada e sem degradê. Luz do alto à esquerda: a junta é recuada e a peça lança sombra só
// dentro dela, numa faixa fina junto às arestas de cima e da esquerda. Cada peça tem borda irregular (cantos e meio das
// arestas longas deslocados até ±0,3 un.) e grão de extrusão: dois a três riscos horizontais translúcidos (≤ 6 % de brilho).
// A argamassa é um neutro quente da rampa das ilustrações com pontilhado leve.
export function amostraSvg(tomBase, rotulo, seed = 20261021) {
  const alt = 13.4;
  const sorteio = mulberry32(seed);
  const j = () => (sorteio() - 0.5) * 0.6; // deslocamento de um ponto da borda, ±0,3 un. (≈ 0,5 px na tela em 1440)
  const pecas = gradePlaquetas({ cols: 14, rows: 19, larg: 34, alt, gap: 3, x0: -23.5, y0: 300 - alt });
  const id = "argamassa-" + tomBase.slice(1).toLowerCase(); // id único por parede: as três ficam no mesmo documento
  const sombra = [], claros = [], escuros = [];
  const corpo = pecas.map((p) => {
    const fill = variar(tomBase, FATOR_TOM[sorteiaTom(sorteio())]);
    const { x, y, w, h } = p;
    sombra.push(`M${r(x - 0.9)} ${r(y - 0.9)}h${r(w + 0.9)}v.9h${r(-w)}v${r(h)}h-.9z`);
    const pts = [[x + j(), y + j()], [x + w / 2, y + j()], [x + w + j(), y + j()],
      [x + w + j(), y + h + j()], [x + w / 2, y + h + j()], [x + j(), y + h + j()]];
    const n = 2 + Math.floor(sorteio() * 2);
    for (let k = 0; k < n; k++) {
      const lw = 4 + sorteio() * 12, lh = 0.4 + sorteio() * 1.1;
      const risco = `<rect x="${r(x + 1 + sorteio() * (w - lw - 2))}" y="${r(y + 1 + sorteio() * (h - lh - 2))}" width="${r(lw)}" height="${r(lh)}"/>`;
      (sorteio() < 0.5 ? claros : escuros).push(risco);
    }
    return `<polygon points="${pts.map(([a, b]) => `${r(a)},${r(b)}`).join(" ")}" fill="${fill}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-label="Parede de plaqueta, tom ${rotulo}">` +
    `<defs><pattern id="${id}" width="4.3" height="3.7" patternUnits="userSpaceOnUse">` +
    `<circle cx=".7" cy=".8" r=".32" fill="#B9AA92" fill-opacity=".4"/><circle cx="3.1" cy="2.2" r=".26" fill="#B9AA92" fill-opacity=".3"/>` +
    `<circle cx="2" cy="3.1" r=".3" fill="#FBF6EC" fill-opacity=".35"/></pattern></defs>` +
    `<rect x="-10" y="-10" width="500" height="320" fill="#D8CCB8"/>` +
    `<rect x="-10" y="-10" width="500" height="320" fill="url(#${id})"/>` +
    `<path d="${sombra.join("")}" fill="#65392A" fill-opacity=".5"/>` +
    corpo +
    `<g fill="#FBF6EC" fill-opacity=".07">${claros.join("")}</g>` +
    `<g fill="#3F241A" fill-opacity=".06">${escuros.join("")}</g>` +
    `</svg>`;
}
