// Trajeto da plaqueta narradora e do caminhão. Puro: só números, sem DOM.

const FORA = 60; // px que o ponto de controle sai da coluna de texto
const ARCO = 0.2; // flecha do arco direto, em fração da distância

// Origem, [controle, parada] por parada, destino. O controle passa por fora (à direita) e um pouco acima.
// Sem paradas, um único controle faz a peça descrever um arco suave (para cima; se o trecho for vertical, para a direita).
export function pontosTrajeto(origem, paradas, destino) {
  const pts = [{ x: origem.x, y: origem.y, rot: 0 }];
  for (const p of paradas) {
    const ant = pts.at(-1);
    pts.push({ x: p.x + FORA, y: (ant.y + p.y) / 2 - 40, rot: p.rot }, { x: p.x, y: p.y, rot: p.rot });
  }
  if (!paradas.length) {
    const dx = destino.x - origem.x;
    const dy = destino.y - origem.y;
    const lado = dx < 0 || (dx === 0 && dy < 0) ? 1 : -1; // normal (−dy, dx)·lado com y ≤ 0, ou x > 0 se vertical
    const k = ARCO * lado;
    pts.push({ x: (origem.x + destino.x) / 2 - dy * k, y: (origem.y + destino.y) / 2 + dx * k, rot: 0 });
  }
  pts.push({ x: destino.x, y: destino.y, rot: 0 });
  return pts;
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
