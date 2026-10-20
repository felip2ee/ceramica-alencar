// Caminhão carregado sobre o mapa do Tocantins, no mesmo chão isométrico (Node, sem DOM). Uso: caminhao(mapa) → { svg, meta }.
// Chão: lon/lat projetados (x leste, y sul) e girados para o norte apontar para cima na tela; z para cima.
// O mapa é uma laje fina de 2; tudo apoia em z = 2.
import * as k from "./kit/iso-kit.mjs";

const AZIMUTE = 35;
const ELEVACAO = 38;
const ROTULO = "Caminhão carregado de plaquetas percorrendo o mapa do Tocantins de Tocantinópolis a Palmas";

const CABE = [420, 560]; // o estado cabe nesta caixa do chão
const LAJE = 2; // espessura do mapa
const ROTA_Z = LAJE + 0.2;
const ALEM = 30; // quanto as rotas vizinhas andam no chão depois da borda do mapa
const ESCALA = 1.5; // o caminhão é desenhado em 60 × 22 × 26 e ampliado para ficar legível no celular
const MARGEM = 24; // em volta de tudo o que a figura desenha, no recorte do viewBox
const ANGULO_MAX = 15; // graus, na tela, entre cada trecho da rota principal e a corda partida → Palmas
const LETRA = 22; // corpo do rótulo usado só para reservar espaço no recorte (o CSS aumenta o rótulo no celular)

// Rotas vizinhas saem de Tocantinópolis e seguem em linha reta (rumo geográfico) até a borda do mapa.
// Goiás segue a rota principal (o tracejado fica sob o vermelho) e desce de Palmas.
const VIZINHAS = [
  { uf: "PA", rumo: [-0.9, -0.45] },
  { uf: "MA", rumo: [0.7, -0.7] },
  { uf: "PI", rumo: [1, 0.2] },
  { uf: "GO", rumo: [0, 1], pelaRota: true },
];

const r1 = (n) => Math.round(n * 10) / 10;
const unit = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
// Gira o chão para o norte (0, −1) cair em −towardViewer: com azimute 35° sem giro, o estado deitaria de lado na tela.
const [SA, CA] = [Math.sin((AZIMUTE * Math.PI) / 180), Math.cos((AZIMUTE * Math.PI) / 180)];
const gira = ([x, y]) => [x * SA + y * CA, -x * CA + y * SA];

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
  if (!Number.isFinite(melhor)) throw new Error("rota sem saída do mapa");
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
export function caminhao(mapa) {
  const lons = mapa.anel.map((p) => p[0]);
  const lats = mapa.anel.map((p) => p[1]);
  const lonMin = Math.min(...lons);
  const latMax = Math.max(...lats);
  const E = Math.min(CABE[0] / (Math.max(...lons) - lonMin), CABE[1] / (latMax - Math.min(...lats)));
  const chao = ([lon, lat]) => gira([(lon - lonMin) * E, (latMax - lat) * E]);

  const anel = mapa.anel.map(chao);
  const toc = chao(mapa.cidades.tocantinopolis);
  const palmas = chao(mapa.cidades.palmas);

  // Ângulo na tela entre dois vetores do chão (independe da escala e da origem da projeção).
  const unidade = { origin: [0, 0], scale: 1, azimuth: AZIMUTE, elevation: ELEVACAO };
  const angulo = (a, b) => {
    const [p, q] = [a, b].map(([x, y]) => k.iso([x, y, 0], unidade));
    return (Math.abs(Math.atan2(p[0] * q[1] - p[1] * q[0], p[0] * q[0] + p[1] * q[1])) * 180) / Math.PI;
  };
  const menos = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const trechoDentro = (a, b) => Array.from({ length: 25 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / 24, a[1] + ((b[1] - a[1]) * i) / 24]).every((p) => dentro(p, anel));

  // Pegada do caminhão (com folga) apontado de c para Palmas, amostrada pelas bordas.
  const pegada = (c, folga) => {
    const h = unit(menos(palmas, c));
    const n = [h[1], -h[0]];
    const [U, V] = [31 * ESCALA + folga, 11 * ESCALA + folga];
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = -U + (2 * U * i) / 8;
      pts.push([u, -V], [u, V]);
    }
    return [...pts, [-U, 0], [U, 0]].map(([u, v]) => [c[0] + u * h[0] + v * n[0], c[1] + u * h[1] + v * n[1]]);
  };
  // Partida: o ponto mais perto de Tocantinópolis em que o caminhão cabe no mapa e o trecho até ele segue a corda.
  const xs0 = anel.map(([x]) => x);
  const ys0 = anel.map(([, y]) => y);
  let centro;
  let melhor = Infinity;
  for (let x = Math.min(...xs0); x <= Math.max(...xs0); x += 2) {
    for (let y = Math.min(...ys0); y <= Math.max(...ys0); y += 2) {
      const c = [x, y];
      const dist = Math.hypot(...menos(c, toc));
      if (dist >= melhor || angulo(menos(c, toc), menos(palmas, c)) > ANGULO_MAX) continue;
      if (pegada(c, 3).every((p) => dentro(p, anel)) && trechoDentro(toc, c)) { centro = c; melhor = dist; }
    }
  }
  if (!centro) throw new Error("caminhão não cabe no mapa apontado para Palmas");
  const rumo = unit(menos(palmas, centro));
  const lado = [rumo[1], -rumo[0]]; // +v é o lado que encara a câmera
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
  const vizinhas = VIZINHAS.map(({ uf, rumo: r, pelaRota }) => {
    const pts = pelaRota ? rota : [toc];
    const d = gira(unit(r));
    const borda = saida(pts.at(-1), d, anel);
    const fim = [borda[0] + d[0] * ALEM, borda[1] + d[1] * ALEM];
    // O trecho no chão não pode voltar a cruzar o mapa (a borda é recortada).
    for (let t = 1; t <= ALEM; t++) if (dentro([borda[0] + d[0] * t, borda[1] + d[1] * t], anel)) throw new Error(`rota ${uf} volta ao mapa`);
    return { uf, linha: [...pts.map(([x, y]) => [x, y, ROTA_Z]), [...borda, ROTA_Z], [...borda, 0], [...fim, 0]], fim, d };
  });

  const cantosCaminhao = [[-31, -14], [30, -14], [30, 14], [-31, 14]].flatMap(([u, v]) => [mundo(u, v, alt(26)), mundo(u, v, 0)]);
  const P0 = k.fitProjection(
    [...anel.flatMap(([x, y]) => [[x, y, 0], [x, y, LAJE]]), ...vizinhas.map((r) => [...r.fim, 0]), ...cantosCaminhao],
    900, 700, { azimuth: AZIMUTE, elevation: ELEVACAO, pad: 40 },
  );

  // Rótulos de pé, na tela: cidades ao lado do ponto, UFs além do terminal, no rumo da rota.
  const rotulos = (P) => {
    const ponto = ([x, y], z) => k.iso([x, y, z], P);
    const [ti, tf] = [ponto(toc, ROTA_Z), ponto(palmas, ROTA_Z)];
    const lista = [
      { texto: "Tocantinópolis", x: ti[0] - 14, y: ti[1] + 12, ancora: "end" },
      { texto: "Palmas", x: tf[0] + 10, y: tf[1], ancora: "start" },
    ];
    for (const { uf, fim, d } of vizinhas) {
      const a = ponto(fim, 0);
      const b = ponto([fim[0] + d[0], fim[1] + d[1]], 0);
      const [dx, dy] = unit(menos(b, a));
      lista.push({ texto: uf, x: a[0] + dx * 10, y: a[1] + dy * 10 + (Math.abs(dx) < 0.4 ? Math.sign(dy) * 6 : 0), ancora: dx > 0.4 ? "start" : dx < -0.4 ? "end" : "middle" });
    }
    return lista;
  };

  // Recorte: caixa de tudo o que se desenha (laje, terminais, caminhão, rótulos) + MARGEM.
  const pontosTela = [
    ...anel.flatMap(([x, y]) => [k.iso([x, y, 0], P0), k.iso([x, y, LAJE], P0)]),
    ...vizinhas.map((r) => k.iso([...r.fim, 0], P0)),
    ...cantosCaminhao.map((p) => k.iso(p, P0)),
    ...rotulos(P0).flatMap(({ texto, x, y, ancora }) => {
      const w = texto.length * LETRA * 0.58;
      const x0 = ancora === "end" ? x - w : ancora === "middle" ? x - w / 2 : x;
      return [[x0, y - LETRA * 0.7], [x0 + w, y + LETRA * 0.7]];
    }),
  ];
  const minX = Math.min(...pontosTela.map(([x]) => x));
  const minY = Math.min(...pontosTela.map(([, y]) => y));
  const LARGURA = Math.ceil(Math.max(...pontosTela.map(([x]) => x)) - minX + 2 * MARGEM);
  const ALTURA = Math.ceil(Math.max(...pontosTela.map(([, y]) => y)) - minY + 2 * MARGEM);
  const P = { ...P0, origin: [P0.origin[0] - minX + MARGEM, P0.origin[1] - minY + MARGEM] };
  const prof = (p) => k.depthOf(p, P);
  const tela = (p) => k.iso(p, P).map(r1);

  // Caixa no referencial do caminhão: u ao longo do rumo (frente em +30), v de lado, z a partir do mapa (antes da ESCALA).
  const anelLocal = (u0, v0, du, dv, r = 0) => k.ringOf({ x: u0, y: v0, w: du, d: dv, r }, r ? 3 : 1)
    .map(([u, v]) => mundo(u, v, 0).slice(0, 2));
  const caixa = (u0, v0, du, dv, z, h, estilo = {}, r = 0) => {
    const ring = anelLocal(u0, v0, du, dv, r);
    const inner = typeof estilo.inner === "function" ? estilo.inner(ring) : estilo.inner;
    return {
      prof: prof(mundo(u0 + du / 2, v0 + dv / 2, alt(z + h / 2))),
      svg: k.solidSvg(k.extrude(ring, alt(z), h * ESCALA, P), { ...estilo, inner }),
    };
  };
  const ordenar = (pecas) => [...pecas].sort((a, b) => a.prof - b.prof).map((p) => p.svg).join("");
  // Aro na face externa da roda: círculo no plano vertical do rumo (o sideRing do kit, girado).
  const aro = (u, v, z, raio) => k.pathOf(Array.from({ length: 20 }, (_, i) => {
    const t = (i / 20) * Math.PI * 2;
    return k.iso(mundo(u + raio * Math.cos(t), v, alt(z + raio * Math.sin(t))), P);
  }), true);

  // ── mapa: laje com halo, rotas vizinhas tracejadas, rota principal vermelha, as duas cidades e os rótulos por cima.
  const laje = k.solidSvg(k.extrude(anel, 0, LAJE, P, { convex: false }), { tone: "lo", className: "mat-mapa", halo: true });
  const rotas = vizinhas.map(({ uf, linha, fim }) => `<g class="rota" data-uf="${uf}">`
    + k.lineSvg(k.pathOf(linha.map((p) => k.iso(p, P))), { tone: "mid", dashed: true })
    + k.dotsSvg([k.iso([...fim, 0], P)], { size: 3, tone: "mid" }) + "</g>").join("");
  const principal = `<path id="rota-principal" class="iso-line" data-tone="red" d="${k.onTop(rota, ROTA_Z, P)}"/>`;
  const cidades = k.dotsSvg([toc, palmas].map(([x, y]) => k.iso([x, y, ROTA_Z], P)), { size: 4, tone: "red" });
  const textos = rotulos(P).map(({ texto, x, y, ancora }) =>
    `<text class="rotulo-mapa" x="${r1(x)}" y="${r1(y)}" text-anchor="${ancora}" dominant-baseline="middle">${texto}</text>`).join("");
  const grupoMapa = k.groupSvg([laje, rotas, principal, cidades, textos], { id: "mapa" });
  // ── caminhão: rodagem, carroceria, carga e cabine, cada camada em ordem de profundidade.
  const escuro = { tone: "hi", className: "mat-pneu" };
  const cabine = { tone: "hi", className: "mat-cabine" };
  const neutro = { tone: "mid" };
  const RODAS = [-22, -14, 21];
  const rodagem = [
    ...RODAS.flatMap((u) => [
      caixa(u - 3, -11, 6, 2, 0, 6, escuro),
      caixa(u - 3, 9, 6, 2, 0, 6, { ...escuro, inner: k.lineSvg(aro(u, 11, 3, 1.6), { tone: "lo" }) }),
    ]),
    caixa(-30, -8, 58, 16, 3, 4, neutro), // chassi
    caixa(-31, -10, 1, 20, 3, 3, escuro), // para-choque traseiro
    caixa(28, -11, 1.5, 22, 3, 4, escuro), // para-choque dianteiro
    caixa(-5, 7, 11, 3.5, 2.5, 4, escuro, 1.5), // tanque
  ];
  const carroceria = caixa(-30, -11, 40, 22, 7, 2, { ...neutro, inner: (ring) => k.lineSvg(k.ringSeam(ring, alt(8), P), { tone: "faint" }) });

  const carga = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const u0 = -29.4 + i * 9.6;
      const v0 = -10.4 + j * 7.1;
      carga.push(caixa(u0, v0, 9, 6.6, 9, 1.2, { tone: "mid", className: "mat-madeira" }));
      carga.push(caixa(u0 + 0.2, v0 + 0.2, 8.6, 6.2, 10.2, 6.8, {
        tone: "mid", className: "mat-plaqueta",
        inner: (ring) => [1.7, 3.4, 5.1].map((dz) => k.lineSvg(k.ringSeam(ring, alt(10.2 + dz), P), { tone: "faint" })).join(""),
      }));
    }
  }
  const frente = [
    ...carga,
    caixa(10.6, -11, 1.2, 22, 9, 10, cabine), // proteção da cabine
    caixa(12.5, -11, 16, 22, 6, 18, { ...cabine, inner: (ring) => k.lineSvg(k.ringSeam(ring, alt(13), P), { tone: "mid" }) }, 1),
    caixa(14, -9, 9, 18, 24, 2, cabine, 1), // defletor
    caixa(19, 11, 8, 0.4, 15, 6.5, { tone: "mid", className: "mat-vidro" }), // vidro da porta
    caixa(28.5, -9, 0.4, 18, 14, 8, { tone: "mid", className: "mat-vidro" }), // para-brisa
    caixa(25.5, 11, 1, 2.5, 15, 5, escuro), // retrovisor
    caixa(25.5, -13.5, 1, 2.5, 15, 5, escuro),
  ];
  // Lanterna na lateral da carroceria, junto à traseira (a face de trás não encara a câmera).
  const lanternas = k.dotsSvg([k.iso(mundo(-29, 11, alt(8)), P)], { size: 1.2, tone: "hi" });
  const halo = `<path class="iso-halo" d="${k.extrude(anelLocal(-31, -11, 60, 22, 2), LAJE, 1, P).fill}"/>`;
  const grupoCaminhao = k.groupSvg([halo, ordenar(rodagem), carroceria.svg, lanternas, ordenar(frente)], { id: "caminhao-veiculo", class: "movel" });

  // Topo da carga: os 12 paletes, onde a Task 7 larga o tijolo.
  const topo = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const [u0, v0] = [-29.2 + i * 9.6, -10.2 + j * 7.1];
    for (const [u, v] of [[u0, v0], [u0 + 8.6, v0], [u0 + 8.6, v0 + 6.2], [u0, v0 + 6.2]]) topo.push(k.iso(mundo(u, v, alt(17)), P));
  }
  const xs = topo.map(([x]) => x);
  const ys = topo.map(([, y]) => y);

  return {
    svg: k.figureSvg({ width: LARGURA, height: ALTURA, label: ROTULO, body: grupoMapa + grupoCaminhao }),
    meta: {
      inicio: tela([...toc, ROTA_Z]),
      fim: tela([...palmas, ROTA_Z]),
      partida: tela([...centro, ROTA_Z]),
      carroceria: { sx: r1(Math.min(...xs)), sy: r1(Math.min(...ys)), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(Math.max(...ys) - Math.min(...ys)) },
    },
  };
}
