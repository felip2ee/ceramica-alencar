// Trajeto da plaqueta narradora e do caminhão. Puro: só números, sem DOM.

const FORA = 60; // px que o ponto de controle sai da coluna de texto
const ARCO = 0.2; // flecha do arco direto, em fração da distância
const CALHA = 12; // no celular, distância da borda direita por onde a plaqueta desce
// Frações do voo (já com a suavização) em que ela entra na calha (cedo, antes de o texto do hero passar por baixo)
// e em que deixa a calha para curvar para dentro do mapa.
export const CORTES_CELULAR = [0.04, 0.7];

// Origem, [controle, parada] por parada, destino. O controle passa por fora (à direita) e um pouco acima.
// Sem paradas, um único controle faz um arco suave: para a direita, ou para cima se o destino fica à esquerda
// da origem por mais de 25% da largura da tela. O lado só depende de dx, então não vira no meio do voo.
// O 4º argumento é a largura da tela (número) ou { mobile, viewportW }. Com mobile e sem paradas (< 768 px, onde o
// texto ocupa a largura toda) o caminho tem 7 pontos, três arcos encadeados: entra na calha direita, desce por ela
// e só nos últimos 30% curva para o destino, que fica no centro do mapa.
export function pontosTrajeto(origem, paradas, destino, opcoes = Infinity) {
  const { mobile = false, viewportW: larguraTela = Infinity } = typeof opcoes === "number" ? { viewportW: opcoes } : opcoes;
  const pts = [{ x: origem.x, y: origem.y, rot: 0 }];
  for (const p of paradas) {
    const ant = pts.at(-1);
    pts.push({ x: p.x + FORA, y: (ant.y + p.y) / 2 - 40, rot: p.rot }, { x: p.x, y: p.y, rot: p.rot });
  }
  if (!paradas.length && mobile) {
    const x = larguraTela - CALHA;
    const [c1, c2] = CORTES_CELULAR.map((c) => origem.y + c * (destino.y - origem.y));
    pts.push(
      { x, y: origem.y, rot: 0 }, { x, y: c1, rot: 0 },
      { x, y: (c1 + c2) / 2, rot: 0 }, { x, y: c2, rot: 0 },
      { x, y: destino.y, rot: 0 },
    );
  } else if (!paradas.length) {
    const dx = destino.x - origem.x;
    const flecha = ARCO * Math.hypot(dx, destino.y - origem.y);
    const paraCima = dx < -0.25 * larguraTela;
    pts.push({
      x: (origem.x + destino.x) / 2 + (paraCima ? 0 : flecha),
      y: (origem.y + destino.y) / 2 - (paraCima ? flecha : 0),
      rot: 0,
    });
  }
  pts.push({ x: destino.x, y: destino.y, rot: 0 });
  return pts;
}

// Ponto da Bézier quadrática [origem, controle, destino] em t ∈ [0, 1].
// Com 7 pontos são três arcos encadeados, emendados em t = CORTES_CELULAR.
export function noArco(pts, t) {
  if (pts.length === 7) {
    const [a, b] = CORTES_CELULAR;
    if (t < a) return noArco(pts.slice(0, 3), t / a);
    if (t < b) return noArco(pts.slice(2, 5), (t - a) / (b - a));
    return noArco(pts.slice(4), (t - b) / (1 - b));
  }
  const [a, c, b] = pts;
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

// Plaqueta 7 × 24 deitada sobre os paletes, em coordenadas do viewBox do caminhão.
// Eixos tirados dos ladrilhos do palete do desenho (16 × 1,7 e −3,6 × 13,6 por ladrilho), espessura 3.
const EIXO_LONGO = [30, 3.2];
const EIXO_CURTO = [-2.3, 8.7];
const ESPESSURA = 3;
export function poligonosCarga({ sx, sy, w, h }) {
  const r = (v) => Math.round(v * 10) / 10;
  const cx = sx + w * 0.54; // sobre a fileira de paletes do meio, atrás da cabine
  const cy = sy + h * 0.34;
  const p0 = [cx - (EIXO_LONGO[0] + EIXO_CURTO[0]) / 2, cy - (EIXO_LONGO[1] + EIXO_CURTO[1]) / 2];
  const p1 = [p0[0] + EIXO_LONGO[0], p0[1] + EIXO_LONGO[1]];
  const p2 = [p1[0] + EIXO_CURTO[0], p1[1] + EIXO_CURTO[1]];
  const p3 = [p0[0] + EIXO_CURTO[0], p0[1] + EIXO_CURTO[1]];
  const baixo = ([x, y]) => [x, y + ESPESSURA];
  const pontos = (ps) => ps.map((p) => p.map(r));
  return { topo: pontos([p0, p1, p2, p3]), frente: pontos([p3, p2, baixo(p2), baixo(p3)]) };
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
