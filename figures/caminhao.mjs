// Caminhão carregado sobre o mapa do Tocantins, no mesmo chão isométrico (Node, sem DOM). Uso: caminhao(mapa) → { svg, meta }.
// Chão: lon/lat projetados (x leste, y sul) e girados para o norte apontar para cima na tela; z para cima.
// O mapa é uma laje fina de 2; tudo apoia em z = 2.
import * as k from "./kit/iso-kit.mjs";
import { hachura, casco, mulberry32, sorteiaTom } from "./casa.mjs";

const AZIMUTE = 35;
const ELEVACAO = 38;
const ROTULO = "Caminhão carregado de plaquetas percorrendo o mapa do Tocantins de Tocantinópolis a Palmas";

const CABE = [420, 560]; // o estado cabe nesta caixa do chão
const LAJE = 3; // espessura da placa do mapa: chão fino, contorno de 1 px e borda hachurada
const ROTA_Z = LAJE + 0.2;
const ESCALA = 2.2; // o caminhão é desenhado em 60 × 22 × 26 e ampliado (licença cartográfica): ~120 px de altura em 1440
const MARGEM = 24; // em volta de tudo o que a figura desenha, no recorte do viewBox
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
const LETRA = 28; // corpo do rótulo usado só para reservar espaço no recorte (main.js aumenta o rótulo no celular)

// Rotas vizinhas saem de Tocantinópolis e seguem em linha reta (rumo geográfico) até a borda do mapa.
// Goiás segue a rota principal (o tracejado fica sob o vermelho) e desce de Palmas.
const VIZINHAS = [
// `alem`: quanto cada rota anda no chão depois da borda do mapa; as laterais vão longe para a figura abrir na largura da célula.
  { uf: "PA", rumo: [-0.9, -0.45], alem: 55 },
  { uf: "MA", rumo: [0.7, -0.7], alem: 45 },
  { uf: "PI", rumo: [1, 0.2], alem: 55 },
  { uf: "GO", rumo: [0, 1], pelaRota: true, alem: 45 },
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
    // de lado, 9 (e não 11) + folga: as rodas podem tocar a borda da placa, e a partida fica mais perto de Tocantinópolis
    const [U, V] = [31 * ESCALA + folga, 9 * ESCALA + folga];
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
    const borda = saida(pts.at(-1), d, anel);
    const fim = [borda[0] + d[0] * ALEM, borda[1] + d[1] * ALEM];
    // O trecho no chão não pode voltar a cruzar o mapa (a borda é recortada).
    for (let t = 1; t <= ALEM; t++) if (dentro([borda[0] + d[0] * t, borda[1] + d[1] * t], anel)) throw new Error(`rota ${uf} volta ao mapa`);
    return { uf, linha: [...pts.map(([x, y]) => [x, y, ROTA_Z]), [...borda, ROTA_Z], [...borda, 0], [...fim, 0]], fim, d };
  });

  const cantosCaminhao = [[-31, -14], [30, -14], [30, 14], [-31, 14]].flatMap(([u, v]) => [mundo(u, v, alt(26)), mundo(u, v, 0)]);
  const P0 = k.fitProjection(
    [...anel.flatMap(([x, y]) => [[x, y, 0], [x, y, LAJE]]), ...vizinhas.map((r) => [...r.fim, 0]), ...cantosCaminhao],
    1000, 820, { azimuth: AZIMUTE, elevation: ELEVACAO, pad: 40 },
  );

  // Rótulos de pé, na tela, ancorados no ponto e afastados em em (dx, dy): o corpo muda com a largura
  // (main.js mantém 14 px na tela), então o afastamento acompanha o corpo e não a escala do mapa.
  const sudoeste = chao([-49.5, -12.0]); // o nome do estado no miolo sul, longe da rota e do caminhão
  const rotulos = (P) => {
    const ponto = ([x, y], z) => k.iso([x, y, z], P);
    const [ti, tf, ce] = [ponto(toc, ROTA_Z), ponto(palmas, ROTA_Z), ponto(sudoeste, LAJE)];
    const lista = [
      // acima e à esquerda, entre a rota do Pará e a do Maranhão: embaixo fica a partida do caminhão
      { texto: "Tocantinópolis", x: ti[0], y: ti[1], dx: -1.6, dy: -0.5, ancora: "end", classe: "rotulo-mapa--largo" },
      // abaixo e à esquerda: o caminhão para em cima do ponto, com a frente para baixo e à direita
      { texto: "Palmas", x: tf[0], y: tf[1], dx: -3.2, dy: 1.2, ancora: "end" },
      { texto: "Tocantins", x: ce[0], y: ce[1], dx: 0, dy: 0, ancora: "middle", classe: "rotulo-mapa--estado" },
    ];
    for (const { uf, fim, d } of vizinhas) {
      const a = ponto(fim, 0);
      const b = ponto([fim[0] + d[0], fim[1] + d[1]], 0);
      const [ux, uy] = unit(menos(b, a));
      lista.push({ texto: uf, x: a[0], y: a[1], dx: ux * 0.6, dy: uy * 0.6 + (Math.abs(ux) < 0.4 ? Math.sign(uy) * 0.4 : 0), ancora: ux > 0.4 ? "start" : ux < -0.4 ? "end" : "middle" });
    }
    return lista;
  };

  // Recorte: caixa de tudo o que se desenha (laje, terminais, caminhão, rótulos) + MARGEM.
  const pontosTela = [
    ...anel.flatMap(([x, y]) => [k.iso([x, y, 0], P0), k.iso([x, y, LAJE], P0)]),
    ...vizinhas.map((r) => k.iso([...r.fim, 0], P0)),
    ...cantosCaminhao.map((p) => k.iso(p, P0)),
    ...rotulos(P0).flatMap(({ texto, x, y, dx, dy, ancora }) => {
      const w = texto.length * LETRA * 0.62;
      const [xa, ya] = [x + dx * LETRA, y + dy * LETRA];
      const x0 = ancora === "end" ? xa - w : ancora === "middle" ? xa - w / 2 : xa;
      return [[x0, ya - LETRA * 0.7], [x0 + w, ya + LETRA * 0.7]];
    }),
  ];
  const minX = Math.min(...pontosTela.map(([x]) => x));
  const minY = Math.min(...pontosTela.map(([, y]) => y));
  const LARGURA = Math.ceil(Math.max(...pontosTela.map(([x]) => x)) - minX + 2 * MARGEM);
  const ALTURA = Math.ceil(Math.max(...pontosTela.map(([, y]) => y)) - minY + 2 * MARGEM);
  const P = { ...P0, origin: [P0.origin[0] - minX + MARGEM, P0.origin[1] - minY + MARGEM] };
  const prof = (p) => k.depthOf(p, P);
  const tela = (p) => k.iso(p, P).map(r1);

  // ── mapa: sombra da laje no papel, laje com costura, rotas vizinhas tracejadas, rota principal vermelha,
  // as duas cidades e os rótulos por cima.
  // A laje projeta no papel (z = 0) o próprio contorno deslocado pelo sol; quase toda fica escondida sob ela,
  // sobra a lasca à direita. Hachura recortada pelo contorno (o anel não é convexo).
  const anelSombra = anel.map(([x, y]) => [x + SOL[0] * LAJE, y + SOL[1] * LAJE]);
  const dSombra = k.pathOf(anelSombra.map(([x, y]) => k.iso([x, y, 0], P)), true);
  const [sx, sy] = [anelSombra.map(([x]) => x), anelSombra.map(([, y]) => y)];
  const caixaSombra = [[Math.min(...sx), Math.min(...sy)], [Math.max(...sx), Math.min(...sy)], [Math.max(...sx), Math.max(...sy)], [Math.min(...sx), Math.max(...sy)]];
  const sombraMapa = `<clipPath id="sombra-mapa"><path d="${dSombra}"/></clipPath><path class="sombra" d="${dSombra}"/>`
    + `<g clip-path="url(#sombra-mapa)">${k.lineSvg(hachura(caixaSombra, HACHURA).map(([a, b]) => k.segment([...a, 0], [...b, 0], P)).join(""), { className: "hachura" })}</g>`;
  // Borda da placa: em cada trecho do contorno virado para a câmera, hachura a 45° no plano (s ao longo do trecho, z).
  const area = anel.reduce((acc, [x, y], i) => { const [x2, y2] = anel[(i + 1) % anel.length]; return acc + x * y2 - x2 * y; }, 0);
  const [tvx, tvy] = k.towardViewer(P);
  const bordaHachura = anel.flatMap((a, i) => {
    const b = anel[(i + 1) % anel.length];
    const [ex, ey] = menos(b, a);
    const len = Math.hypot(ex, ey);
    const [nx, ny] = area > 0 ? [ey / len, -ex / len] : [-ey / len, ex / len];
    if (nx * tvx + ny * tvy <= 1e-9 || len < 0.5) return [];
    const f = ([t, z]) => [a[0] + (ex * t) / len, a[1] + (ey * t) / len, z];
    return hachura([[0, 0], [len, 0], [len, LAJE], [0, LAJE]], 1.6).map(([q, r]) => k.segment(f(q), f(r), P));
  }).join("");
  const laje = k.solidSvg(k.extrude(anel, 0, LAJE, P, { convex: false }), {
    tone: "hi", className: "mat-mapa silhueta-mapa",
    inner: k.lineSvg(bordaHachura, { className: "hachura hachura--borda" }),
  });
  const rotas = vizinhas.map(({ uf, linha, fim }) => `<g class="rota" data-uf="${uf}">`
    + k.lineSvg(k.pathOf(linha.map((p) => k.iso(p, P))), { tone: "mid", dashed: true })
    + k.dotsSvg([k.iso([...fim, 0], P)], { size: 3, tone: "mid" }) + "</g>").join("");
  const principal = `<path id="rota-principal" class="iso-line" data-tone="red" d="${k.onTop(rota, ROTA_Z, P)}"/>`;
  const cidades = k.dotsSvg([toc, palmas].map(([x, y]) => k.iso([x, y, ROTA_Z], P)), { size: 4, tone: "red" });
  const textos = rotulos(P).map(({ texto, x, y, dx, dy, ancora, classe }) =>
    `<text class="rotulo-mapa${classe ? ` ${classe}` : ""}" x="${r1(x)}" y="${r1(y)}" dx="${r1(dx)}em" dy="${r1(dy)}em" text-anchor="${ancora}" dominant-baseline="middle">${texto}</text>`).join("");
  // Fundo cor de papel atrás de cada rótulo (região do filtro = caixa do texto + ~2 px): rótulo nunca sobre traço.
  const fundo = `<filter id="fundo-rotulo" x="-0.06" y="-0.14" width="1.12" height="1.28"><feFlood flood-color="#FAF8F1"/><feComposite in="SourceGraphic"/></filter>`;
  const grupoMapa = k.groupSvg([fundo, sombraMapa, laje, rotas, principal, cidades, textos], { id: "mapa" });
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
  const roda = (u, vDentro, vFora) => {
    const banda = k.pathOf(casco([...disco(u, vDentro, R), ...disco(u, vFora, R)]), true);
    contorno.push(banda);
    const face = vista(vFora > 0 ? "+v" : "-v");
    const detalhe = face
      ? `<path class="roda-face" d="${k.pathOf(disco(u, vFora, R), true)}"/>`
        + `<path class="roda-aro" d="${k.pathOf(disco(u, vFora, R * 0.58), true)}"/>`
        + k.lineSvg(k.pathOf(disco(u, vFora, R * 0.22), true), { tone: "hi" })
        + k.lineSvg(k.pathOf(disco(u, vFora, R * 0.82), true), { tone: "faint", className: "junta" })
      : "";
    return {
      prof: prof(mundo(u, (vDentro + vFora) / 2, alt(R))),
      svg: `<g class="roda"><path class="roda-banda" d="${banda}"/>${detalhe}${k.lineSvg(banda, { tone: "hi", className: "aresta" })}</g>`,
    };
  };
  const escuro = { tone: "hi", className: "mat-pneu" };
  const cabine = { tone: "hi", className: "mat-cabine" };
  const neutro = { tone: "mid" };
  const claro = { tone: "mid", className: "mat-cobertura" };
  const rodagem = [
    ...RODAS.flatMap((u) => [roda(u, -9, -11), roda(u, 9, 11)]),
    caixa(-30, -8, 58, 16, 3, 4, neutro), // chassi
    caixa(-31, -10, 1, 20, 3, 3, escuro), // para-choque traseiro
    caixa(28, -11, 1.5, 22, 3, 4, { ...escuro, inner: k.lineSvg(k.segment(...[-10, 10].map((v) => mundo(29.5, v, alt(5))), P), { tone: "mid" }) }), // para-choque com friso
    caixa(-5, 7, 11, 3.5, 2.5, 4, escuro, 1.5), // tanque
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
    // grade: cinco frisos entre os faróis
    k.lineSvg([8, 9, 10, 11, 12].map((z) => k.segment(faceU(CAB.u1)([-6, z]), faceU(CAB.u1)([6, z]), P)).join(""), { tone: "mid" }),
    k.lineSvg(sombraCab, { className: "hachura hachura--clara" }),
  ].join("");
  const frente = [
    ...carga,
    guarda(-11), guarda(10.4),
    caixa(10.6, -11, 1.2, 22, 9, 10, cabine), // proteção da cabine
    caixa(CAB.u0, CAB.v0, CAB.u1 - CAB.u0, CAB.v1 - CAB.v0, CAB.z0, CAB.z1 - CAB.z0, { ...cabine, inner: detalheCab }, 1),
    caixa(14, -9, 9, 18, 24, 2, cabine, 1), // defletor
    caixa(27, -10, 3, 20, 22.4, 0.8, cabine), // quebra-sol
    caixa(19, 11, 8, 0.4, 15, 6.5, { tone: "mid", className: "mat-vidro", inner: vidro(faceV(11.4), 19, 15, 27, 21.5, caidaLado) }), // vidro da porta
    caixa(28.5, -9, 0.4, 18, 14, 8, { tone: "mid", className: "mat-vidro", inner: vidro(faceU(28.9), -9, 14, 9, 22, caidaFrente) }), // para-brisa
    ...[-9.5, 6.5].map((v) => caixa(28.5, v, 0.6, 3, 9.5, 2, { tone: "lo", className: "mat-farol" })), // faróis
    caixa(28, 11, 0.6, 2.2, 15, 5, escuro), // retrovisores na quina da frente, fora do vidro da porta
    caixa(28, -13.2, 0.6, 2.2, 15, 5, escuro),
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
    svg: k.figureSvg({ width: LARGURA, height: ALTURA, label: ROTULO, body: grupoMapa + grupoCaminhao }),
    meta: {
      inicio: tela([...toc, ROTA_Z]),
      fim: tela([...palmas, ROTA_Z]),
      partida: tela([...centro, ROTA_Z]),
      // para onde o norte aponta na tela, em graus no sentido horário a partir de cima (a seta do canto da célula)
      norte: (() => { const [nx, ny] = menos(k.iso([...gira([0, -1]), 0], P), k.iso([0, 0, 0], P)); return Math.round((Math.atan2(nx, -ny) * 180) / Math.PI); })(),
      carroceria: {
        sx: r1(Math.min(...xs)), sy: r1(Math.min(...ys)), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(Math.max(...ys) - Math.min(...ys)),
        // onde a plaqueta extra deita: no fardo do meio junto à cabine, eixos 24 : 7 ao longo do caminhão (ampliada para ler)
        centro: tela(mundo(-5.7, 0, alt(17.6))),
        eixos: [[8.2, 0], [0, 2.4]].map(([du, dv]) => menos(k.iso(mundo(du, dv, 0), P), k.iso(mundo(0, 0, 0), P)).map(r1)),
      },
    },
  };
}
