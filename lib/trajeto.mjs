// Trajeto da plaqueta narradora e do caminhão. Puro: só números, sem DOM.

const ROT = [-6, 4];
const FORA = 60; // px que o ponto de controle sai da coluna de texto

// Um alvo por seção, em px da viewport (canto superior esquerdo da plaqueta fixa).
// No celular (< 768) todas as paradas ficam no canto inferior direito, fora do texto.
export function alvosParadas(secoes, viewportW, viewportH) {
  const celular = viewportW < 768;
  return secoes.map(({ titleRight }, i) => ({
    x: celular ? viewportW - 70 : Math.min(titleRight + 48, viewportW - 140),
    y: celular ? viewportH - 120 : viewportH * 0.42,
    rot: ROT[i % 2],
  }));
}

// Origem, [controle, parada] por parada, destino. O controle passa por fora (à direita) e um pouco acima.
export function pontosTrajeto(origem, paradas, destino) {
  const pts = [{ x: origem.x, y: origem.y, rot: 0 }];
  for (const p of paradas) {
    const ant = pts.at(-1);
    pts.push({ x: p.x + FORA, y: (ant.y + p.y) / 2 - 40, rot: p.rot }, { x: p.x, y: p.y, rot: p.rot });
  }
  pts.push({ x: destino.x, y: destino.y, rot: 0 });
  return pts;
}

// Janelas de scroll (px desde o início do trecho) de cada perna: [0, chega₀], [sai₀, chega₁], …, [saiₙ, total].
// Força ordem crescente e prende em [0, total], para a timeline nunca ter tempos negativos ou invertidos.
export function janelas(total, paradas) {
  let ant = 0;
  const marcos = [0, ...paradas.flatMap((p) => [p.chega, p.sai]), total]
    .map((v) => (ant = Math.min(total, Math.max(ant, v))));
  const pernas = [];
  for (let i = 0; i < marcos.length; i += 2) pernas.push({ de: marcos[i], ate: marcos[i + 1] });
  return pernas;
}

// Vértices do `d` (só M/L absolutos) a partir do vértice mais perto da partida, relativos a ela.
// shortcut: supõe polilinha M…L… com a partida num vértice (é como caminhao.mjs desenha); curvas pediriam getRawPath.
export function rotaDesde(d, [px, py]) {
  const n = d.match(/-?\d*\.?\d+/g).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push({ x: n[i], y: n[i + 1] });
  const dist = (p) => Math.hypot(p.x - px, p.y - py);
  const k = pts.reduce((m, p, i) => (dist(p) < dist(pts[m]) ? i : m), 0);
  return pts.slice(k).map((p) => ({ x: +(p.x - px).toFixed(2), y: +(p.y - py).toFixed(2) }));
}
