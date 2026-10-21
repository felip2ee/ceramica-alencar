import { gradePlaquetas } from "../lib/abertura.mjs";
import { mulberry32, sorteiaTom } from "./casa.mjs";

// Tom de queima por peça, como na casa: 65 % base, 25 % um pouco mais claro, 10 % um pouco mais escuro.
const FATOR_TOM = [1, 1.07, 0.9];

function variar(hex, fator) {
  const canal = (i) => Math.min(255, Math.round(parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) * fator));
  return "#" + [0, 1, 2].map((i) => canal(i).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// direção (x1 y1 x2 y2, em fração da peça) e força do degradê de luz: cerca de ±6 % de brilho dentro de cada peça
const GRADES = [[0, 0, 1, 1, 0.08, 0.07], [0.2, 0, 0.8, 1, 0.06, 0.05], [0, 0.2, 1, 0.8, 0.07, 0.06], [0, 0, 1, 0.6, 0.05, 0.08]];

const r = (n) => Math.round(n * 100) / 100;
const ret = (x, y, w, h) => `M${r(x)} ${r(y)}h${r(w)}v${r(h)}h${r(-w)}z`;

// Parede em aparelho corrido que sangra além do viewBox (cols 14 / rows 19 cobrem 480x300 nas duas paridades de fileira; peça na proporção 19 : 7,5).
// Luz única do alto à esquerda (a mesma da casa e do caminhão): a argamassa fica recuada e em sombra; cada peça projeta
// uma faixa escura na junta, embaixo e à direita; a aresta de cima e da esquerda pega luz, a de baixo e da direita escurece;
// dentro da peça, um degradê sorteado entre quatro muda o brilho em cerca de ±6 %.
export function amostraSvg(tomBase, rotulo, seed = 20261021) {
  const alt = 13.4;
  const sorteio = mulberry32(seed);
  const pecas = gradePlaquetas({ cols: 14, rows: 19, larg: 34, alt, gap: 3, x0: -23.5, y0: 300 - alt });
  const sombra = [], luz = [], escuro = [];
  const id = "luz-" + tomBase.slice(1).toLowerCase(); // ids únicos por parede: as três ficam no mesmo documento
  const defs = GRADES.map(([x1, y1, x2, y2, clareia, escurece], i) =>
    `<linearGradient id="${id}-${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="#FFF" stop-opacity="${clareia}"/><stop offset=".55" stop-color="#FFF" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="${escurece}"/></linearGradient>`).join("");
  const corpo = pecas.map((p) => {
    const fill = variar(tomBase, FATOR_TOM[sorteiaTom(sorteio())]);
    sombra.push(ret(p.x + 1.3, p.y + 1.3, p.w, p.h));
    luz.push(`M${r(p.x + 0.3)} ${r(p.y + p.h - 0.6)}V${r(p.y + 0.3)}H${r(p.x + p.w - 0.6)}`);
    escuro.push(`M${r(p.x + 0.6)} ${r(p.y + p.h - 0.3)}H${r(p.x + p.w - 0.3)}V${r(p.y + 0.6)}`);
    // luz dentro da peça: um degradê do alto à esquerda (mais claro) para baixo à direita (mais escuro), sorteado entre 4 variações
    return `<rect x="${r(p.x)}" y="${r(p.y)}" width="${p.w}" height="${p.h}" fill="${fill}"/>` +
      `<rect x="${r(p.x)}" y="${r(p.y)}" width="${p.w}" height="${p.h}" fill="url(#${id}-${Math.floor(sorteio() * GRADES.length)})"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-label="Parede de plaqueta, tom ${rotulo}">` +
    `<defs>${defs}</defs>` +
    `<rect x="-10" y="-10" width="500" height="320" fill="#C9BBA6"/>` + // argamassa
    `<path d="${sombra.join("")}" fill="#65392A" fill-opacity=".55"/>` +
    corpo +
    `<path d="${luz.join("")}" fill="none" stroke="#FBF6EC" stroke-opacity=".28" stroke-width=".6"/>` +
    `<path d="${escuro.join("")}" fill="none" stroke="#3F241A" stroke-opacity=".3" stroke-width=".6"/>` +
    `</svg>`;
}
