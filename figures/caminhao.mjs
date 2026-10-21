// Caminhão carregado sobre o mapa do Tocantins, no mesmo chão isométrico (Node, sem DOM). Uso: caminhao(mapa) → { svg, meta }.
// Chão: lon/lat projetados (x leste, y sul) e girados para o norte apontar para cima na tela; z para cima.
// O mapa é uma laje fina de 2; tudo apoia em z = 2.
import * as k from "./kit/iso-kit.mjs";
import { hachura, casco, mulberry32, sorteiaTom } from "./casa.mjs";

const AZIMUTE = 35;
const ELEVACAO = 24; // câmera baixa: a placa do mapa recua como chão, no mesmo isométrico do caminhão
const ROTULO = "Caminhão carregado de plaquetas percorrendo o mapa do Tocantins de Tocantinópolis a Palmas";

const CABE = [420, 560]; // o estado cabe nesta caixa do chão
const LAJE = 3; // espessura da placa do mapa: borda visível (~8 px na escala da célula), hachurada em toda a frente
const ROTA_Z = LAJE + 0.2;
const ESCALA = 2.1; // o caminhão é desenhado em 60 × 22 × 26 e ampliado (licença cartográfica): com o estado inteiro no quadro, ~130 px de altura em 1440
// viewBox fixo na proporção da célula da figura (largura total, ~60 % da tela); o svg usa slice e corta o excesso
const LARGURA = 1440;
const ALTURA = 540; // a célula da figura em 1440 × 900 tem ~1440 × 534 (a faixa de rótulos fecha a dobra)
const GRUPO_LARGURA = 0.94; // o estado inteiro (mais fábrica e caminhão em Palmas) em fração da largura do quadro
const ANGULO_MAX = 15;
// Giro do chão (graus) depois de pôr o norte para cima: a rota Tocantinópolis → Palmas desce na diagonal,
// da esquerda alta para a direita baixa, e o caminhão aparece de lado em 3/4 (cabine, lateral e rodas).
const GIRO = -52;
// Sol único, o mesmo da casa (casa.mjs, SOMBRA): relativo à câmera, a sombra anda 0,648 para a direita da tela
// e 0,103 na direção do observador por unidade de altura (sol alto, à frente e à esquerda). Aqui em x, y do chão.
const SOL = (() => {
  const [s, c] = [Math.sin((AZIMUTE * Math.PI) / 180), Math.cos((AZIMUTE * Math.PI) / 180)];
  return [0.6484 * s + 0.1031 * c, -0.6484 * c + 0.1031 * s];
})();
const HACHURA = 2.4; // passo da hachura de sombra, em unidades do chão (≈ 3 px na tela, como na casa) // graus, na tela, entre cada trecho da rota principal e a corda partida → Palmas

// Rotas vizinhas saem de Tocantinópolis e seguem em linha reta (rumo geográfico) até a borda do mapa.
// Goiás segue a rota principal (o tracejado fica sob o vermelho) e desce de Palmas.
const VIZINHAS = [
// `alem`: quanto cada rota anda no chão depois da borda do mapa; as laterais vão longe para a figura abrir na largura da célula.
  { uf: "PA", rumo: [-0.9, -0.45], alem: 50 },
  { uf: "MA", rumo: [0.7, -0.7], alem: 50 },
  { uf: "PI", rumo: [1, 0.2], alem: 50 },
  { uf: "GO", rumo: [0, 1], pelaRota: true, alem: 50 },
];

const r1 = (n) => Math.round(n * 10) / 10;
const unit = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
// Gira o chão para o norte (0, −1) cair em −towardViewer: com azimute 35° sem giro, o estado deitaria de lado na tela.
const [SA, CA] = [Math.sin((AZIMUTE * Math.PI) / 180), Math.cos((AZIMUTE * Math.PI) / 180)];
const [SG, CG] = [Math.sin((GIRO * Math.PI) / 180), Math.cos((GIRO * Math.PI) / 180)];
const gira = ([x, y]) => {
  const [a, b] = [x * SA + y * CA, -x * CA + y * SA];
  return [a * CG - b * SG, a * SG + b * CG];
};

function dentro([x, y], anel) {
  let c = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Primeiro cruzamento do raio p + t·d (t > 0) com a borda do anel.
function saida(p, d, anel) {
  let melhor = Infinity;
  for (let i = 0; i < anel.length; i++) {
    const a = anel[i], b = anel[(i + 1) % anel.length];
    const e = [b[0] - a[0], b[1] - a[1]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-12) continue;
    const w = [a[0] - p[0], a[1] - p[1]];
    const t = (w[0] * e[1] - w[1] * e[0]) / den;
    const s = (w[0] * d[1] - w[1] * d[0]) / den;
    if (t > 1e-6 && s >= 0 && s <= 1 && t < melhor) melhor = t;
  }
  if (!Number.isFinite(melhor)) throw new Error(`rota sem saída do mapa a partir de ${p.map(Math.round)}`);
  return [p[0] + d[0] * melhor, p[1] + d[1] * melhor];
}

/**
 * Contrato de `meta` (coordenadas de tela, unidades do viewBox, já recortado):
 * - `inicio`: Tocantinópolis no plano da rota; `fim`: Palmas no plano da rota (`inicio[1] < fim[1]`).
 * - `partida`: onde o centro do caminhão toca a rota na figura estática (é um vértice de `#rota-principal`).
 * - `carroceria`: `{ sx, sy, w, h }`, caixa do topo da carga (os 12 paletes), onde a Task 7 larga um tijolo.
 * O grupo `#caminhao-veiculo` está desenhado em coordenadas absolutas do viewBox, já na partida:
 * para levá-lo ao ponto `p` da rota, translade-o por `p − partida`. O caminhão aponta para a corda partida → Palmas,
 * e cada trecho da rota fica a até ANGULO_MAX graus dela, então ele não anda de lado.
 */
const menos = (a, b) => [a[0] - b[0], a[1] - b[1]];

export function caminhao(mapa) {
  const lons = mapa.anel.map((p) => p[0]);
  const lats = mapa.anel.map((p) => p[1]);
  const lonMin = Math.min(...lons);
  const latMax = Math.max(...lats);
  const E = Math.min(CABE[0] / (Math.max(...lons) - lonMin), CABE[1] / (latMax - Math.min(...lats)));
  const chao = ([lon, lat]) => gira([(lon - lonMin) * E, (latMax - lat) * E]);

  // Contorno suavizado: 60 vértices do dado bruto e um passo de Chaikin (120), sem serrilhado nem espinhos.
  const anel = (() => {
    const bruto = mapa.anel.map(chao);
    const poucos = Array.from({ length: 60 }, (_, i) => bruto[Math.floor((i * bruto.length) / 60)]);
    return poucos.flatMap((a, i) => {
      const b = poucos[(i + 1) % poucos.length];
      return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]];
    });
  })();
  const centroide = anel.reduce(([a, b], [x, y]) => [a + x / anel.length, b + y / anel.length], [0, 0]);
  // Tocantinópolis fica na beira do rio: depois da suavização, leva o ponto ao lugar mais perto dentro do mapa (+3).
  const perto = (p) => {
    if (dentro(p, anel)) return p;
    for (let r = 1; r < 120; r++) {
      const q = Array.from({ length: 48 }, (_, i) => [p[0] + r * Math.cos((i * Math.PI) / 24), p[1] + r * Math.sin((i * Math.PI) / 24)])
        .find((q) => dentro(q, anel) && dentro([q[0] + (q[0] - p[0]) * 3 / r, q[1] + (q[1] - p[1]) * 3 / r], anel));
      if (q) return [q[0] + ((q[0] - p[0]) * 3) / r, q[1] + ((q[1] - p[1]) * 3) / r];
    }
    throw new Error("cidade longe do mapa");
  };
  const toc = perto(chao(mapa.cidades.tocantinopolis));
  const palmas = chao(mapa.cidades.palmas);

  // Ângulo na tela entre dois vetores do chão (independe da escala e da origem da projeção).
  const unidade = { origin: [0, 0], scale: 1, azimuth: AZIMUTE, elevation: ELEVACAO };
  const angulo = (a, b) => {
    const [p, q] = [a, b].map(([x, y]) => k.iso([x, y, 0], unidade));
    return (Math.abs(Math.atan2(p[0] * q[1] - p[1] * q[0], p[0] * q[0] + p[1] * q[1])) * 180) / Math.PI;
  };
  const trechoDentro = (a, b) => Array.from({ length: 24 }, (_, i) => [a[0] + ((b[0] - a[0]) * (i + 1)) / 24, a[1] + ((b[1] - a[1]) * (i + 1)) / 24]).every((p) => dentro(p, anel));

  // Pegada do caminhão (com folga) apontado de c para Palmas, amostrada pelas bordas.
  const pegada = (c, folga) => {
    const h = unit(menos(palmas, c));
    const n = [h[1], -h[0]];
    // de lado, 9 (e não 11) + folga: as rodas podem tocar a borda da placa, e a partida fica mais perto de Tocantinópolis
    const [U, V] = [31 * ESCALA + folga, 9 * ESCALA + folga];
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = -U + (2 * U * i) / 8;
      pts.push([u, -V], [u, V]);
    }
    return [...pts, [-U, 0], [U, 0]].map(([u, v]) => [c[0] + u * h[0] + v * n[0], c[1] + u * h[1] + v * n[1]]);
  };
  // Fábrica em Tocantinópolis: galpão de shed ao longo da corda até Palmas, um pouco para dentro do mapa.
  const corda = unit(menos(palmas, toc));
  const FAB = { L: 44, W: 28, H: 11, t: 6, c: 30, r: 2.8 }; // unidades do chão: comprimento, largura, parede, dente do shed, chaminé (altura, raio)
  const fabC = (() => { const d = unit(menos(centroide, toc)); return [toc[0] + d[0] * 8, toc[1] + d[1] * 8]; })();
  // eixos da fábrica: a ao longo da corda (para o caminhão), b de lado, virado para a câmera
  const fa = corda;
  const fb = corda[1] * CA - corda[0] * SA > 0 ? [corda[1], -corda[0]] : [-corda[1], corda[0]];
  const fabMundo = (a, b, z) => [fabC[0] + a * fa[0] + b * fb[0], fabC[1] + a * fa[1] + b * fb[1], z];
  // Partida: o ponto mais perto de Tocantinópolis em que o caminhão cabe no mapa, sai da frente da fábrica
  // e o trecho até ele segue a corda.
  const xs0 = anel.map(([x]) => x);
  const ys0 = anel.map(([, y]) => y);
  let centro;
  let melhor = Infinity;
  for (let x = Math.min(...xs0); x <= Math.max(...xs0); x += 2) {
    for (let y = Math.min(...ys0); y <= Math.max(...ys0); y += 2) {
      const c = [x, y];
      const dist = Math.hypot(...menos(c, toc));
      if (dist >= melhor || dist < 31 * ESCALA + FAB.L / 2 + 4 || angulo(menos(c, toc), menos(palmas, c)) > ANGULO_MAX) continue;
      if (pegada(c, 3).every((p) => dentro(p, anel)) && trechoDentro(toc, c)) { centro = c; melhor = dist; }
    }
  }
  if (!centro) throw new Error("caminhão não cabe no mapa apontado para Palmas");
  const rumo = unit(menos(palmas, centro));
  // +v é o lado que encara a câmera (a lateral com porta, tanque e rodas detalhadas)
  const lado = rumo[1] * CA - rumo[0] * SA > 0 ? [rumo[1], -rumo[0]] : [-rumo[1], rumo[0]];
  const mundo = (u, v, z) => [centro[0] + ESCALA * (u * rumo[0] + v * lado[0]), centro[1] + ESCALA * (u * rumo[1] + v * lado[1]), z];
  const alt = (z) => LAJE + z * ESCALA;

  // Rota principal: Tocantinópolis → partida → um S suave em volta da corda → Palmas.
  const L = Math.hypot(...menos(palmas, centro));
  const desvio = L * 0.025;
  const curva = [[1 / 3, desvio], [2 / 3, -desvio]].map(([t, d]) => [centro[0] + rumo[0] * L * t + lado[0] * d, centro[1] + rumo[1] * L * t + lado[1] * d]);
  const rota = [toc, centro, ...curva, palmas];
  rota.slice(1).forEach((b, i) => {
    const a = rota[i];
    if (angulo(menos(b, a), rumo) > ANGULO_MAX || !trechoDentro(a, b)) throw new Error(`trecho ${i} da rota fora do limite: ${angulo(menos(b, a), rumo).toFixed(1)}°, dentro=${trechoDentro(a, b)}`);
  });

  // Rotas vizinhas: no mapa até a borda, descem a espessura da laje e seguem no chão até um ponto terminal.
  const vizinhas = VIZINHAS.map(({ uf, rumo: r, pelaRota, alem: ALEM }) => {
    const pts = pelaRota ? rota : [toc];
    const d = gira(unit(r));
    // última saída do mapa nesse rumo (o raio pode sair numa baía e voltar a entrar)
    let borda = saida(pts.at(-1), d, anel);
    for (let volta = 0; volta < 6; volta++) {
      const t = Array.from({ length: ALEM }, (_, i) => i + 1).find((t) => dentro([borda[0] + d[0] * t, borda[1] + d[1] * t], anel));
      if (!t) break;
      borda = saida([borda[0] + d[0] * (t + 0.5), borda[1] + d[1] * (t + 0.5)], d, anel);
    }
    // O trecho no chão não pode voltar a cruzar o mapa (a borda é recortada): para antes, se for o caso.
    let alem = ALEM;
    for (let t = 1; t <= ALEM; t++) if (dentro([borda[0] + d[0] * t, borda[1] + d[1] * t], anel)) { alem = t - 6; break; }
    if (alem < 12) throw new Error(`rota ${uf} volta ao mapa logo depois da borda`);
    const fim = [borda[0] + d[0] * alem, borda[1] + d[1] * alem];
    return { uf, linha: [...pts.map(([x, y]) => [x, y, ROTA_Z]), [...borda, ROTA_Z], [...borda, 0], [...fim, 0]], fim, d };
  });

  // Enquadramento: o estado inteiro, a fábrica e o caminhão parado em Palmas cabem no quadro (GRUPO_LARGURA da largura,
  // 88 % da altura), centrados. Pedido do dono em 2026-10-21: ver o mapa de fora a fora e o caminhão inteiro.
  const unidade3 = { origin: [0, 0], scale: 1, azimuth: AZIMUTE, elevation: ELEVACAO };
  const emPalmas = (u, v, z) => [palmas[0] + ESCALA * (u * rumo[0] + v * lado[0]), palmas[1] + ESCALA * (u * rumo[1] + v * lado[1]), z];
  const grupo = [
    ...[-FAB.L / 2, FAB.L / 2].flatMap((a) => [-FAB.W / 2, FAB.W / 2].flatMap((b) => [fabMundo(a, b, LAJE), fabMundo(a, b, LAJE + FAB.H + FAB.t)])),
    fabMundo(-FAB.L / 2 + 5, FAB.W / 2 + 5, LAJE + FAB.c + 2),
    ...[-31, 30].flatMap((u) => [-11, 11].flatMap((v) => [emPalmas(u, v, LAJE), emPalmas(u, v, alt(26))])),
    ...anel.flatMap(([x, y]) => [[x, y, 0], [x, y, LAJE]]),
  ].map((q) => k.iso(q, unidade3));
  const [gx, gy] = [grupo.map(([x]) => x), grupo.map(([, y]) => y)];
  // pela largura, sem passar de 88 % da altura; centro a 52 % da altura (um pouco abaixo, por causa da legenda em cima)
  const escalaTela = Math.min((GRUPO_LARGURA * LARGURA) / (Math.max(...gx) - Math.min(...gx)), (0.88 * ALTURA) / (Math.max(...gy) - Math.min(...gy)));
  const meio = [((Math.max(...gx) + Math.min(...gx)) / 2) * escalaTela, ((Math.max(...gy) + Math.min(...gy)) / 2) * escalaTela];
  const P = { origin: [LARGURA / 2 - meio[0], ALTURA * 0.52 - meio[1]], scale: escalaTela, azimuth: AZIMUTE, elevation: ELEVACAO };

  // Rótulos de pé, na tela, ancorados no ponto e afastados em em (dx, dy): o corpo muda com a largura
  // (main.js mantém 14 px na tela), então o afastamento acompanha o corpo e não a escala do mapa.
  const oeste = chao([-48.9, -8.7]); // o nome do estado no miolo a oeste da rota, onde nem o caminhão chega
  const rotulos = (P) => {
    const ponto = ([x, y], z) => k.iso([x, y, z], P);
    const [tf, ce] = [ponto(palmas, ROTA_Z), ponto(oeste, LAJE)];
    // acima da fábrica: o ponto mais alto entre a chaminé e o shed
    const topoFab = [fabMundo(-FAB.L / 2 + 5, FAB.W / 2 + 5, LAJE + FAB.c + 4), fabMundo(0, 0, LAJE + FAB.H + FAB.t)].map((q) => k.iso(q, P));
    const fx = k.iso(fabMundo(0, 0, LAJE), P)[0];
    const lista = [
      { texto: "Fábrica · Tocantinópolis", x: fx, y: Math.min(...topoFab.map(([, y]) => y)), dx: 0, dy: -1, ancora: "middle", classe: "rotulo-mapa--largo" },
      // abaixo e à esquerda: o caminhão para em cima do ponto, com a frente para baixo e à direita
      { texto: "Palmas", x: tf[0], y: tf[1], dx: -5, dy: 2.4, ancora: "end", classe: "rotulo-mapa--largo" },
      // no celular o rótulo é grande perto do desenho: nomes curtos e afastamentos menores, para caberem no quadro
      { texto: "Fábrica", x: fx, y: Math.min(...topoFab.map(([, y]) => y)), dx: 0, dy: -0.8, ancora: "middle", classe: "rotulo-mapa--estreito" },
      { texto: "Palmas", x: tf[0], y: tf[1], dx: -4, dy: -0.1, ancora: "end", classe: "rotulo-mapa--estreito" }, // ≥ 8 px do fio de baixo em 390
      { texto: "Tocantins", x: ce[0], y: ce[1], dx: 0, dy: 0, ancora: "middle", classe: "rotulo-mapa--largo" },
    ];
    // Área útil do quadro (o svg corta ~10 unidades em cima e embaixo; a legenda ocupa o alto à esquerda).
    const [x0, y0, x1, y1] = [28, 70, LARGURA - 28, ALTURA - 28];
    const noQuadro = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    for (const { uf, fim, d, linha } of vizinhas) {
      const a = ponto(fim, 0);
      const b = ponto([fim[0] + d[0], fim[1] + d[1]], 0);
      const [ux, uy] = unit(menos(b, a));
      if (!noQuadro(a)) {
        // a estrada sai do quadro: o rótulo fica onde ela cruza a borda, para dentro
        const pts = linha.map((q) => ponto(q, q[2]));
        const i = pts.findIndex((q, j) => j && noQuadro(pts[j - 1]) && !noQuadro(q));
        if (i < 1) continue;
        const [q0, q1] = [pts[i - 1], pts[i]];
        let t = 1;
        for (const [lim, eixo] of [[x0, 0], [x1, 0], [y0, 1], [y1, 1]]) {
          const tt = (lim - q0[eixo]) / (q1[eixo] - q0[eixo]);
          if (tt >= 0 && tt < t) t = tt;
        }
        const [cx, cy] = [q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t];
        const borda = cx <= x0 + 1 ? "esq" : cx >= x1 - 1 ? "dir" : cy >= y1 - 1 ? "baixo" : "cima";
        const pos = { esq: [0.4, -0.9, "start"], dir: [-0.4, -0.9, "end"], baixo: [0.8, -0.6, "start"], cima: [0.8, 0.9, "start"] }[borda];
        lista.push({ texto: uf, x: cx, y: cy, dx: pos[0], dy: pos[1], ancora: pos[2], classe: "rotulo-mapa--largo" });
        continue;
      }
      lista.push({ texto: uf, x: a[0], y: a[1], dx: ux * 0.7, dy: uy * 0.7 + (Math.abs(ux) < 0.4 ? Math.sign(uy) * 0.4 : 0), ancora: ux > 0.4 ? "start" : ux < -0.4 ? "end" : "middle", classe: "rotulo-mapa--largo" });
    }
    return lista;
  };
  const prof = (p) => k.depthOf(p, P);
  const tela = (p) => k.iso(p, P).map(r1);

  // ── mapa: chão dos estados vizinhos, sombra da placa, placa com borda hachurada, estradas, fábrica, Palmas, rótulos.
  const [tvx, tvy] = k.towardViewer(P);
  const area = anel.reduce((acc, [x, y], i) => { const [x2, y2] = anel[(i + 1) % anel.length]; return acc + x * y2 - x2 * y; }, 0);
  const fora = (a, b) => { const [ex, ey] = menos(b, a); const l = Math.hypot(ex, ey) || 1; return area > 0 ? [ey / l, -ex / l] : [-ey / l, ex / l]; };
  const plano = (pts, z) => k.pathOf(pts.map(([x, y]) => k.iso([x, y, z], P)), true);
  const caixaDe = (pts) => { const [xs, ys] = [pts.map(([x]) => x), pts.map(([, y]) => y)]; return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]]; };
  const hachuraPlano = (pts, z, id, passo) => `<clipPath id="${id}"><path d="${plano(pts, z)}"/></clipPath>`
    + `<g clip-path="url(#${id})">${k.lineSvg(hachura(caixaDe(pts), passo).map(([a, b]) => k.segment([...a, z], [...b, z], P)).join(""), { className: "hachura hachura--leve" })}</g>`;
  // Chão dos vizinhos: uma faixa de 70 em volta do estado, no papel, hachurada de leve (é para onde as estradas vão).
  const vizinho = anel.map((p, i) => {
    const [a, b] = [anel[(i - 1 + anel.length) % anel.length], anel[(i + 1) % anel.length]];
    const n = fora(a, b);
    return [p[0] + n[0] * 70, p[1] + n[1] * 70];
  });
  const chaoVizinho = `<path class="vizinho" d="${plano(vizinho, 0)}"/>` + hachuraPlano(vizinho, 0, "vizinho", 7)
    + k.lineSvg(plano(vizinho, 0), { tone: "faint", dashed: true });
  // Sombra da placa no papel: o contorno deslocado pelo sol; sobra a lasca do lado da sombra.
  const anelSombra = anel.map(([x, y]) => [x + SOL[0] * LAJE, y + SOL[1] * LAJE]);
  const sombraMapa = `<path class="sombra" d="${plano(anelSombra, 0)}"/>` + hachuraPlano(anelSombra, 0, "sombra-mapa", HACHURA).replace("hachura hachura--leve", "hachura");
  // Borda da placa: em cada trecho do contorno virado para a câmera, hachura a 45° no plano (s ao longo do trecho, z).
  const bordaHachura = anel.flatMap((a, i) => {
    const b = anel[(i + 1) % anel.length];
    const [ex, ey] = menos(b, a);
    const len = Math.hypot(ex, ey);
    const [nx, ny] = fora(a, b);
    if (nx * tvx + ny * tvy <= 1e-9 || len < 0.5) return [];
    const f = ([t, z]) => [a[0] + (ex * t) / len, a[1] + (ey * t) / len, z];
    return hachura([[0, 0], [len, 0], [len, LAJE], [0, LAJE]], 2).map(([q, r]) => k.segment(f(q), f(r), P));
  }).join("");
  const laje = k.solidSvg(k.extrude(anel, 0, LAJE, P, { convex: false }), {
    tone: "hi", className: "mat-mapa silhueta-mapa",
    inner: k.lineSvg(bordaHachura, { className: "hachura hachura--borda" }),
  });
  // Estradas: faixa no plano do chão (duas bordas e miolo claro). A principal, com a linha vermelha no meio,
  // tem ~1,6 vez a largura do caminhão; as vizinhas, mais estreitas e de leve, terminam num marco com o rótulo.
  const faixa = (pts, w) => {
    const n = pts.map((p, i) => { const t = unit(menos(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)])); return [-t[1], t[0]]; });
    const lado = (s) => pts.map((p, i) => [p[0] + (n[i][0] * w * s) / 2, p[1] + (n[i][1] * w * s) / 2]);
    return [lado(1), lado(-1)];
  };
  const estrada = (pts, z, w, classe) => {
    const [e, d] = faixa(pts, w);
    return `<g class="${classe}"><path class="estrada" d="${plano([...e, ...d.reverse()], z)}"/>`
      + k.lineSvg(k.pathOf(e.map(([x, y]) => k.iso([x, y, z], P))) + k.pathOf(faixa(pts, w)[1].map(([x, y]) => k.iso([x, y, z], P))), { className: "estrada-borda" }) + "</g>";
  };
  const LARG_ESTRADA = 22 * ESCALA * 1.6;
  const estradasChao = vizinhas.map(({ linha }) => estrada(linha.slice(-2).map(([x, y]) => [x, y]), 0, LARG_ESTRADA * 0.55, "estrada-vizinha")).join("");
  const estradasPlaca = vizinhas.map(({ uf, linha, pelaRota }) => estrada((pelaRota ? [palmas, linha.at(-3)] : linha.slice(0, -2)).map(([x, y]) => [x, y]), ROTA_Z - 0.1, LARG_ESTRADA * 0.55, "estrada-vizinha")).join("");
  const principalFaixa = `<clipPath id="placa-topo"><path d="${plano(anel, LAJE)}"/></clipPath><g clip-path="url(#placa-topo)">${estradasPlaca}${estrada(rota, ROTA_Z - 0.05, LARG_ESTRADA, "estrada-principal")}</g>`;
  const rotas = vizinhas.map(({ uf, linha, fim }) => `<g class="rota" data-uf="${uf}">`
    + k.lineSvg(k.pathOf(linha.map((p) => k.iso(p, P))), { tone: "faint", dashed: true })
    + k.dotsSvg([k.iso([...fim, 0], P)], { size: 3.5, tone: "hi" }) + "</g>").join("");
  const principal = `<path id="rota-principal" class="iso-line" data-tone="red" d="${k.onTop(rota, ROTA_Z, P)}"/>`;
  // ponto de Palmas em tinta: o vermelho fica só na linha da rota e no botão
  const cidades = k.dotsSvg([k.iso([...palmas, ROTA_Z], P)], { size: 4, tone: "hi" });

  // ── fábrica: galpão de plaqueta com shed de três dentes (vidro virado para o caminhão), anexo e chaminé.
  const fabContorno = [];
  const fabCaixa = (a0, b0, da, db, z, h, estilo) => {
    const ring = [[a0, b0], [a0 + da, b0], [a0 + da, b0 + db], [a0, b0 + db]].map(([a, b]) => fabMundo(a, b, 0).slice(0, 2));
    const sol = k.extrude(ring, z, h, P);
    fabContorno.push(sol.fill);
    return k.solidSvg(sol, estilo);
  };
  const { L: FL, W: FW, H: FH, t: FT } = FAB;
  const poli = (pts, classe) => { const d = k.pathOf(pts.map((q) => k.iso(q, P)), true); fabContorno.push(d); return `<path class="${classe}" d="${d}"/>`; };
  const dentes = [0, 1, 2].map((i) => {
    const [a0, a1] = [-FL / 2 + (i * FL) / 3, -FL / 2 + ((i + 1) * FL) / 3];
    const [bm, bM, z0] = [-FW / 2, FW / 2, LAJE + FH];
    const pano = poli([fabMundo(a0, bm, z0), fabMundo(a1, bm, z0 + FT), fabMundo(a1, bM, z0 + FT), fabMundo(a0, bM, z0)], "fab-telhado");
    const empena = poli([fabMundo(a0, bM, z0), fabMundo(a1, bM, z0 + FT), fabMundo(a1, bM, z0)], "fab-empena");
    const vidro = poli([fabMundo(a1, bm, z0), fabMundo(a1, bm, z0 + FT), fabMundo(a1, bM, z0 + FT), fabMundo(a1, bM, z0)], "fab-vidro");
    const caixilhos = k.lineSvg([1, 2, 3].map((j) => k.segment(fabMundo(a1, bm + (j * FW) / 4, z0), fabMundo(a1, bm + (j * FW) / 4, z0 + FT), P)).join(""), { className: "junta" });
    return `<g class="fab-dente">${pano}${empena}${vidro}${caixilhos}</g>`;
  });
  const chamine = fabMundo(-FL / 2 + 5, FW / 2 + 5, 0);
  const fabPecas = [
    fabCaixa(-FL / 2, -FW / 2, FL, FW, LAJE, FH, { tone: "hi", className: "mat-plaqueta",
      inner: k.lineSvg([0.25, 0.5, 0.75].map((f) => k.segment(fabMundo(-FL / 2, FW / 2, LAJE + FH * f), fabMundo(FL / 2, FW / 2, LAJE + FH * f), P)).join(""), { className: "junta" }) }),
    ...dentes,
    fabCaixa(FL / 2 - 14, FW / 2, 14, 8, LAJE, 6, { tone: "hi", className: "mat-cobertura" }), // escritório
    (() => { const c = k.cylinder(chamine[0], chamine[1], FAB.r, LAJE, FAB.c, P, 16); fabContorno.push(c.fill); return k.solidSvg(c, { tone: "hi", className: "mat-plaqueta" }); })(),
    (() => { const c = k.cylinder(chamine[0], chamine[1], FAB.r + 0.8, LAJE + FAB.c, 2, P, 16); fabContorno.push(c.fill); return k.solidSvg(c, { tone: "hi", className: "mat-cobertura" }); })(),
  ];
  // sombra da fábrica na placa, mesmo sol: galpão até o shed e chaminé
  const projetaFab = (a, b, h) => { const [x, y] = fabMundo(a, b, 0); return [x + SOL[0] * h, y + SOL[1] * h]; };
  const sombraFab = [
    casco([-FL / 2, FL / 2].flatMap((a) => [-FW / 2, FW / 2].flatMap((b) => [fabMundo(a, b, 0).slice(0, 2), projetaFab(a, b, FH + FT)]))),
    casco([[-3, -3], [3, -3], [3, 3], [-3, 3]].flatMap(([da, db]) => [fabMundo(-FL / 2 + 5 + da, FW / 2 + 5 + db, 0).slice(0, 2), projetaFab(-FL / 2 + 5 + da, FW / 2 + 5 + db, FAB.c + 2)])),
  ];
  const fabrica = `<g class="fabrica">`
    + `<path class="sombra" d="${sombraFab.map((pl) => plano(pl, LAJE)).join("")}"/>`
    + k.lineSvg(sombraFab.flatMap((pl) => hachura(pl, HACHURA)).map(([a, b]) => k.segment([...a, LAJE], [...b, LAJE], P)).join(""), { className: "hachura" })
    + `<path class="silhueta-fundo" d="__FAB_CONTORNO__"/>` + fabPecas.join("") + "</g>";
  const textos = rotulos(P).map(({ texto, x, y, dx, dy, ancora, classe }) =>
    `<text class="rotulo-mapa${classe ? ` ${classe}` : ""}" x="${r1(x)}" y="${r1(y)}" dx="${r1(dx)}em" dy="${r1(dy)}em" text-anchor="${ancora}" dominant-baseline="middle">${texto}</text>`).join("");
  const grupoMapa = k.groupSvg([chaoVizinho, estradasChao, sombraMapa, laje, principalFaixa, rotas, principal, cidades,
    fabrica.replace("__FAB_CONTORNO__", fabContorno.join("")), textos], { id: "mapa" });
  // Caixa no referencial do caminhão: u ao longo do rumo (frente em +30), v de lado, z a partir do mapa (antes da ESCALA).
  const anelLocal = (u0, v0, du, dv, r = 0) => k.ringOf({ x: u0, y: v0, w: du, d: dv, r }, r ? 3 : 1)
    .map(([u, v]) => mundo(u, v, 0).slice(0, 2));
  const contorno = []; // preenchimento de cada peça do caminhão: base da silhueta de 2 px
  const caixa = (u0, v0, du, dv, z, h, estilo = {}, r = 0) => {
    const ring = anelLocal(u0, v0, du, dv, r);
    const inner = typeof estilo.inner === "function" ? estilo.inner(ring) : estilo.inner;
    const solido = k.extrude(ring, alt(z), h * ESCALA, P);
    contorno.push(solido.fill);
    return {
      prof: prof(mundo(u0 + du / 2, v0 + dv / 2, alt(z + h / 2))),
      svg: k.solidSvg(solido, { ...estilo, inner }),
    };
  };
  const ordenar = (pecas) => [...pecas].sort((a, b) => a.prof - b.prof).map((p) => p.svg).join("");

  // Faces do caminhão como planos 2D: faceU(U) é o plano u = U em (v, z); faceV(V) é o plano v = V em (u, z).
  // u, v e z escalam igual (ESCALA), então 45° no plano é 45° no mundo, como a hachura da casa.
  const faceU = (U) => ([v, z]) => mundo(U, v, alt(z));
  const faceV = (V) => ([u, z]) => mundo(u, V, alt(z));
  const quad = (f, a0, b0, a1, b1) => k.pathOf([[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map((q) => k.iso(f(q), P)), true);
  const hachuraFace = (f, poli, passo) => hachura(poli, passo).map(([a, b]) => k.segment(f(a), f(b), P)).join("");
  // Luz por face: normal no chão (+u = rumo, +v = lado). A face vista pela câmera e de costas para o sol leva hachura.
  // (tvx, tvy: rumo da câmera, declarado na borda da placa)
  const normal = { "+u": rumo, "-u": [-rumo[0], -rumo[1]], "+v": lado, "-v": [-lado[0], -lado[1]] };
  const vista = (n) => normal[n][0] * tvx + normal[n][1] * tvy > 1e-6;
  // deslocamento ao longo da normal por unidade de queda do raio de sol (< 0: o raio vem de fora para a face, ela está ao sol)
  const solNa = (n) => SOL[0] * normal[n][0] + SOL[1] * normal[n][1];
  const naSombra = (n) => solNa(n) >= 0;
  const sorteio = mulberry32(20261022);
  // Tom de queima por plaqueta, sem correlação (65 / 25 / 10): véu claro ou escuro por cima do tom da face,
  // para a luz do kit (uma cor por face) continuar valendo.
  const tons = (pecas) => {
    const porTom = [[], [], []];
    for (const d of pecas) porTom[sorteiaTom(sorteio())].push(d);
    return [["tom-claro", porTom[1]], ["tom-escuro", porTom[2]]].map(([c, ds]) => (ds.length ? `<path class="${c}" d="${ds.join("")}"/>` : "")).join("");
  };
  const junta = (d) => k.lineSvg(d, { tone: "faint", className: "junta" });

  // ── sombra projetada no mapa (z = LAJE), mesmo vetor da casa: carroceria com carga até 17, cabine até 26.
  const projetaChao = (u, v, z) => {
    const [x, y] = mundo(u, v, 0);
    const h = alt(z) - LAJE;
    return [x + SOL[0] * h, y + SOL[1] * h];
  };
  const volume = (u0, u1, v0, v1, z) => casco([u0, u1].flatMap((u) => [v0, v1].flatMap((v) => [mundo(u, v, 0).slice(0, 2), projetaChao(u, v, z)])));
  const sombras = [volume(-31, 10.6, -11, 11, 17), volume(10.6, 29.5, -11, 11, 26)];
  const sombraD = sombras.map((pl) => k.pathOf(pl.map(([x, y]) => k.iso([x, y, LAJE], P)), true)).join("");
  const sombraCaminhao = `<path class="sombra" d="${sombraD}"/>`
    + k.lineSvg(sombras.flatMap((pl) => hachura(pl, HACHURA)).map(([a, b]) => k.segment([...a, LAJE], [...b, LAJE], P)).join(""), { className: "hachura" });

  // ── rodas: pneu com banda de rodagem (casco dos dois discos), aro neutro e cubo, na face que encara a câmera.
  const RODAS = [-22, -14, 21];
  const R = 3;
  const disco = (u, v, raio, zc = R) => Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2;
    return k.iso(mundo(u + raio * Math.cos(t), v, alt(zc + raio * Math.sin(t))), P);
  });
  // borracha em papel + tinta: hachura densa (≈ 2,5 px) na banda, na tela, e na face, no plano da roda; o aro fica em papel
  const PASSO_PNEU = 0.5;
  const roda = (u, vDentro, vFora) => {
    const casca = casco([...disco(u, vDentro, R), ...disco(u, vFora, R)]);
    const banda = k.pathOf(casca, true);
    contorno.push(banda);
    const face = vista(vFora > 0 ? "+v" : "-v");
    const circulo = Array.from({ length: 24 }, (_, i) => { const t = (i / 24) * Math.PI * 2; return [u + R * Math.cos(t), R + R * Math.sin(t)]; });
    const hachuraBanda = hachura(casca, 2.5).map(([a, b]) => `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`).join("");
    const detalhe = face
      ? `<path class="roda-face" d="${k.pathOf(disco(u, vFora, R), true)}"/>`
        + k.lineSvg(hachuraFace(faceV(vFora), circulo, PASSO_PNEU), { className: "hachura hachura--pneu" })
        + `<path class="roda-aro" d="${k.pathOf(disco(u, vFora, R * 0.58), true)}"/>`
        + k.lineSvg(k.pathOf(disco(u, vFora, R * 0.22), true), { tone: "hi" })
        + k.lineSvg(k.pathOf(disco(u, vFora, R * 0.82), true), { tone: "faint", className: "junta" })
      : "";
    return {
      prof: prof(mundo(u, (vDentro + vFora) / 2, alt(R))),
      svg: `<g class="roda"><path class="roda-banda" d="${banda}"/>${k.lineSvg(hachuraBanda, { className: "hachura hachura--pneu" })}${detalhe}${k.lineSvg(banda, { tone: "hi", className: "aresta" })}</g>`,
    };
  };
  const cabine = { tone: "hi", className: "mat-cabine" };
  const neutro = { tone: "mid" };
  const claro = { tone: "mid", className: "mat-cobertura" };
  const rodagem = [
    ...RODAS.flatMap((u) => [roda(u, -9, -11), roda(u, 9, 11)]),
    caixa(-30, -8, 58, 16, 3, 4, neutro), // chassi
    caixa(-31, -10, 1, 20, 3, 3, cabine), // para-choque traseiro
    caixa(28, -11, 1.5, 22, 3, 4, { ...cabine, inner: k.lineSvg(k.segment(...[-10, 10].map((v) => mundo(29.5, v, alt(5))), P), { tone: "mid" }) }), // para-choque com friso
    caixa(-5, 7, 11, 3.5, 2.5, 4, cabine, 1.5), // tanque
    caixa(13, 10, 5, 2, 4.5, 1, claro), // estribo da porta
  ];

  // ── carroceria: assoalho com costura e guardas laterais baixas com fueiros.
  const carroceria = caixa(-30, -11, 40, 22, 7, 2, { ...neutro, inner: (ring) => k.lineSvg(k.ringSeam(ring, alt(8), P), { tone: "faint" }) });
  const FUEIROS = [-29.5, -19.5, -9.5, 0.5, 9.5];
  const guarda = (v0) => caixa(-30, v0, 40, 0.6, 9, 1.4, {
    ...claro,
    inner: k.lineSvg(FUEIROS.map((u) => k.segment(mundo(u, v0 + 0.6, alt(9)), mundo(u, v0 + 0.6, alt(10.4)), P)).join(""), { tone: "mid" }),
  });

  // ── carga: 12 paletes (neutro) com fardos de plaqueta; cada plaqueta com o seu tom e as juntas em amarração.
  const carga = [];
  const FIADA = 1.7;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const u0 = -29.4 + i * 9.6;
      const v0 = -10.4 + j * 7.1;
      const [a0, a1, b0, b1, z0, z1] = [u0 + 0.2, u0 + 8.8, v0 + 0.2, v0 + 6.4, 10.2, 17];
      carga.push(caixa(u0, v0, 9, 6.6, 9, 1.2, {
        tone: "mid", className: "mat-palete",
        inner: vista("+v") ? k.lineSvg([2.6, 6.4].map((du) => k.segment(mundo(u0 + du, v0 + 6.6, alt(9)), mundo(u0 + du, v0 + 6.6, alt(10.2)), P)).join(""), { tone: "mid" }) : "",
      }));
      carga.push(caixa(u0 + 0.2, v0 + 0.2, 8.6, 6.2, z0, z1 - z0, {
        tone: "mid", className: "mat-plaqueta",
        inner: () => {
          const pecas = [];
          const linhas = [];
          // faces laterais vistas: 4 fiadas, juntas a meia peça
          const lados = [["+u", faceU(a1), b0, b1, 2], ["-u", faceU(a0), b0, b1, 2], ["+v", faceV(b1), a0, a1, 3], ["-v", faceV(b0), a0, a1, 3]];
          for (const [n, f, s0, s1, por] of lados) {
            if (!vista(n)) continue;
            const passo = (s1 - s0) / por;
            for (let c = 0; c < 4; c++) {
              const [h0, h1] = [z0 + c * FIADA, Math.min(z1, z0 + (c + 1) * FIADA)];
              const cortes = [s0, ...Array.from({ length: por }, (_, m) => s0 + passo * (m + (c % 2 ? 0.5 : 1))).filter((x) => x < s1 - 0.1), s1];
              cortes.slice(1).forEach((b, m) => pecas.push(quad(f, cortes[m], h0, b, h1)));
              cortes.slice(1, -1).forEach((x) => linhas.push(k.segment(f([x, h0]), f([x, h1]), P)));
              if (c) linhas.push(k.segment(f([s0, h0]), f([s1, h0]), P));
            }
          }
          // topo: 4 fileiras ao longo de u, 3 peças por fileira, desencontradas
          const topo = ([u, v]) => mundo(u, v, alt(z1));
          const larg = (b1 - b0) / 4;
          for (let c = 0; c < 4; c++) {
            const [w0, w1] = [b0 + c * larg, b0 + (c + 1) * larg];
            const passo = (a1 - a0) / 3;
            const cortes = [a0, ...[0.5, 1.5, 2.5].map((m) => a0 + passo * (m + (c % 2 ? 0 : 0.5))).filter((x) => x < a1 - 0.1), a1];
            cortes.slice(1).forEach((b, m) => pecas.push(k.pathOf([[cortes[m], w0], [b, w0], [b, w1], [cortes[m], w1]].map((q) => k.iso(topo(q), P)), true)));
            cortes.slice(1, -1).forEach((x) => linhas.push(k.segment(topo([x, w0]), topo([x, w1]), P)));
            if (c) linhas.push(k.segment(topo([a0, w0]), topo([a1, w0]), P));
          }
          // hachura nas faces de costas para o sol (como a face curta da casa)
          const sombra = lados.filter(([n]) => vista(n) && naSombra(n))
            .map(([, f, s0, s1]) => hachuraFace(f, [[s0, z0], [s1, z0], [s1, z1], [s0, z1]], HACHURA / ESCALA)).join("");
          return tons(pecas) + junta(linhas.join("")) + k.lineSvg(sombra, { className: "hachura" });
        },
      }));
    }
  }

  // ── cabine: caixa com raio, quebra-sol, para-brisa e vidro da porta com caixilho de borracha, dois tons e sombra
  // do quebra-sol; costura da porta, maçaneta, grade e faróis.
  const CAB = { u0: 12.5, u1: 28.5, v0: -11, v1: 11, z0: 6, z1: 24 };
  const vidro = (f, a0, b0, a1, b1, aba) => {
    // aba: quanto a peça de cima avança sobre o vidro; a sombra desce aba / (deslocamento do sol contra a face)
    const R = 0.5; // borracha
    const queda = aba;
    return [
      k.lineSvg(quad(f, a0 + R, b0 + R, a1 - R, b1 - R), { tone: "hi" }),
      `<path class="vidro-alto" d="${quad(f, a0 + R, b0 + R + (b1 - b0 - 2 * R) * 0.55, a1 - R, b1 - R)}"/>`,
      k.lineSvg(hachuraFace(f, [[a0, Math.max(b0, b1 - queda)], [a1, Math.max(b0, b1 - queda)], [a1, b1], [a0, b1]], 0.8), { className: "hachura" }),
    ].join("");
  };
  const caidaFrente = solNa("+u") < 0 ? 1.5 / -solNa("+u") : 8;
  const caidaLado = solNa("+v") < 0 ? 0.6 / -solNa("+v") : 6.5;
  const sombraCab = ["+u", "+v"].filter((n) => vista(n) && naSombra(n)).map((n) => n === "+u"
    ? hachuraFace(faceU(CAB.u1), [[CAB.v0, CAB.z0], [CAB.v1, CAB.z0], [CAB.v1, CAB.z1], [CAB.v0, CAB.z1]], HACHURA / ESCALA)
    : hachuraFace(faceV(CAB.v1), [[CAB.u0, CAB.z0], [CAB.u1, CAB.z0], [CAB.u1, CAB.z1], [CAB.u0, CAB.z1]], HACHURA / ESCALA)).join("");
  const detalheCab = (ring) => [
    k.lineSvg(k.ringSeam(ring, alt(13), P), { tone: "mid" }),
    // porta: costura em U e maçaneta
    k.lineSvg(k.pathOf([[18.5, 7.5], [18.5, 22.5], [27.5, 22.5], [27.5, 7.5]].map((q) => k.iso(faceV(CAB.v1)(q), P))), { tone: "mid", className: "junta" }),
    k.lineSvg(k.segment(faceV(CAB.v1)([19.5, 13.8]), faceV(CAB.v1)([21.5, 13.8]), P), { tone: "lo" }),
    // grade: um quadro entre os faróis (frisos cruzariam a hachura da face de sombra e virariam xadrez)
    k.lineSvg(quad(faceU(CAB.u1), -6, 8, 6, 12), { tone: "mid" }),
    k.lineSvg(sombraCab, { className: "hachura" }),
  ].join("");
  const frente = [
    ...carga,
    guarda(-11), guarda(10.4),
    caixa(10.6, -11, 1.2, 22, 9, 10, cabine), // proteção da cabine
    caixa(CAB.u0, CAB.v0, CAB.u1 - CAB.u0, CAB.v1 - CAB.v0, CAB.z0, CAB.z1 - CAB.z0, { ...cabine, inner: detalheCab }, 1),
    caixa(14, -9, 9, 18, 24, 2, cabine), // defletor
    caixa(27, -10, 3, 20, 22.4, 0.8, cabine), // quebra-sol
    caixa(19, 11, 8, 0.4, 15, 6.5, { tone: "mid", className: "mat-vidro", inner: vidro(faceV(11.4), 19, 15, 27, 21.5, caidaLado) }), // vidro da porta
    caixa(28.5, -9, 0.4, 18, 14, 8, { tone: "mid", className: "mat-vidro", inner: vidro(faceU(28.9), -9, 14, 9, 22, caidaFrente) }), // para-brisa
    ...[-9.5, 6.5].map((v) => caixa(28.5, v, 0.6, 3, 9.5, 2, { tone: "lo", className: "mat-farol" })), // faróis
    caixa(28, 11, 0.6, 2.2, 15, 5, cabine), // retrovisores na quina da frente, fora do vidro da porta
    caixa(28, -13.2, 0.6, 2.2, 15, 5, cabine),
  ];
  // Lanterna na lateral da carroceria, junto à traseira (a face de trás não encara a câmera).
  const lanternas = k.dotsSvg([k.iso(mundo(-29, 11, alt(8)), P)], { size: 1.2, tone: "hi" });
  const corpo = [ordenar(rodagem), carroceria.svg, lanternas, ordenar(frente)].join("");
  // Silhueta de 2 px: os preenchimentos de todas as peças, em tinta com traço de 4 px, por baixo de tudo;
  // as peças cobrem o miolo e sobra só a borda externa do conjunto.
  const silhueta = `<path class="silhueta-fundo" d="${contorno.join("")}"/>`;
  const grupoCaminhao = k.groupSvg([sombraCaminhao, silhueta, corpo], { id: "caminhao-veiculo", class: "movel" });

  // Topo da carga: os 12 paletes, onde a Task 7 larga o tijolo.
  const topo = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const [u0, v0] = [-29.2 + i * 9.6, -10.2 + j * 7.1];
    for (const [u, v] of [[u0, v0], [u0 + 8.6, v0], [u0 + 8.6, v0 + 6.2], [u0, v0 + 6.2]]) topo.push(k.iso(mundo(u, v, alt(17)), P));
  }
  const xs = topo.map(([x]) => x);
  const ys = topo.map(([, y]) => y);

  return {
    // slice: a célula corta o chão que passa do quadro (no celular, os lados), sem achatar o desenho
    svg: k.figureSvg({ width: LARGURA, height: ALTURA, label: ROTULO, body: grupoMapa + grupoCaminhao }).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" '),
    meta: {
      inicio: tela([...toc, ROTA_Z]),
      fim: tela([...palmas, ROTA_Z]),
      partida: tela([...centro, ROTA_Z]),
      // para onde o norte aponta na tela, em graus no sentido horário a partir de cima (a seta do canto da célula)
      norte: (() => { const [nx, ny] = menos(k.iso([...gira([0, -1]), 0], P), k.iso([0, 0, 0], P)); return Math.round((Math.atan2(nx, -ny) * 180) / Math.PI); })(),
      carroceria: {
        sx: r1(Math.min(...xs)), sy: r1(Math.min(...ys)), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(Math.max(...ys) - Math.min(...ys)),
        // onde a plaqueta extra deita: no fardo do meio junto à cabine, eixos 19 : 7,5 ao longo do caminhão (ampliada para ler)
        centro: tela(mundo(-5.7, 0, alt(17.6))),
        eixos: [[7.6, 0], [0, 3]].map(([du, dv]) => menos(k.iso(mundo(du, dv, 0), P), k.iso(mundo(0, 0, 0), P)).map(r1)),
      },
    },
  };
}
