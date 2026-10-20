// Geometria da casa isométrica do hero (Node, sem DOM). Uso: casa() → { svg, meta }.
// Mundo em unidades ≈ px: x e y no chão, z para cima. A face y=140 é o muro comprido (frente-esquerda),
// a face x=200 tem o pano de vidro e um retorno curto de plaqueta junto à quina.
import * as k from "./kit/iso-kit.mjs";

const LARGURA = 900;
const ALTURA = 620;
const ROTULO = "Casa moderna de um pavimento revestida em plaqueta de barro, com sala mobiliada vista pelo pano de vidro";

const PLANTA = { x: 0, y: 0, w: 200, d: 140, r: 0 };
const PISO_Z = -6;
const FIADA = 7; // altura de uma plaqueta
const FILEIRAS = 14; // 14 × 7 = 98 de pé-direito
const PE = FIADA * FILEIRAS;
const ESP = 4; // espessura dos muros
const RETORNO = 104; // na face x=200, o trecho de plaqueta vai de y=104 até a quina
const CINTA = 7; // viga recuada que forma a fresta de sombra sob a cobertura
const BEIRAL = 8;
const COBERTURA = 7;
const COB_Z = PE + CINTA;
const PAINEIS = [0, 1, 2].flatMap((i) => [0, 1].map((j) => ({ x: 34 + i * 37, y: 16 + j * 26, w: 34, d: 23, r: 0 })));
const PLANO_COB = { x: -BEIRAL, y: -BEIRAL, w: PLANTA.w + 2 * BEIRAL, d: PLANTA.d + 2 * BEIRAL, r: 0 };

// Juntas verticais (peças de 24): pares cruzam meia peça com os ímpares; a quina alterna de dono.
const JUNTAS_FRENTE = [[176, 152, 128, 104, 80, 56, 32, 8], [188, 164, 140, 116, 92, 68, 44, 20]];
const JUNTAS_RETORNO = [[112], [124]];
const SOLTA = { x: 140, y: PLANTA.d - ESP, w: 24, d: ESP, r: 0 }; // vão da última fileira (ímpar), entre as juntas 140 e 164

const r1 = (n) => Math.round(n * 10) / 10;

export function casa() {
  const P = k.fitProjection(
    [...k.boxCorners(PLANTA, PISO_Z, 120), ...k.boxCorners(PLANO_COB, COB_Z, COB_Z + COBERTURA), [244, 70, PISO_Z]],
    LARGURA, ALTURA, { pad: 40, azimuth: 40, elevation: 30 },
  );
  const prof = (p) => k.depthOf(p, P);
  const meio = (plan, z, h) => [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];

  // Cada peça é { prof, svg }; ordenar() pinta de trás para frente.
  const caixa = (plan, z, h, estilo = {}) => ({
    prof: prof(meio(plan, z, h)),
    svg: k.solidSvg(k.slabOf(plan, z, h, P, 3), estilo),
  });
  const cilindro = (cx, cy, raio, z, h, estilo = {}) => ({
    prof: prof([cx, cy, z + h / 2]),
    svg: k.solidSvg(k.cylinder(cx, cy, raio, z, h, P, raio > 4 ? 28 : 16), estilo),
  });
  const lamina = (cx, cy, ang, larg, z, h, estilo) => {
    const [c, s] = [Math.cos(ang), Math.sin(ang)];
    const ring = [[-larg, 0], [larg, 0], [0, larg * 0.35]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
    return { prof: prof([cx, cy, z + h / 2]), svg: k.solidSvg(k.extrude(ring, z, h, P), estilo) };
  };
  const ordenar = (pecas) => [...pecas].sort((a, b) => a.prof - b.prof).map((p) => p.svg).join("");
  const grupo = (pecas, attrs, centro) => ({ prof: prof(centro), svg: k.groupSvg(ordenar(pecas), attrs) });

  const camadas = [];

  // 0 · piso, deck e pedras: a base, pintada antes de tudo que apoia nela.
  const deck = { x: 200, y: 4, w: 26, d: 100, r: 0 };
  const tabuas = Array.from({ length: 9 }, (_, i) => k.lineOnTop([deck.x, 14 + i * 10], [deck.x + deck.w, 14 + i * 10], -2, P)).join("");
  camadas.push(k.groupSvg([
    `<path class="iso-halo" d="${k.haloOf({ x: -6, y: -6, w: 240, d: 172, r: 8 }, PISO_Z, 1, P)}"/>`,
    ordenar([
      caixa(PLANTA, PISO_Z, -PISO_Z, { tone: "mid" }),
      caixa(deck, PISO_Z, 4, { tone: "mid", className: "mat-madeira", inner: k.lineSvg(tabuas, { tone: "lo" }) }),
      caixa({ x: 232, y: 60, w: 12, d: 18, r: 2 }, PISO_Z, 1.2, { tone: "lo" }),
      caixa({ x: 232, y: 84, w: 12, d: 14, r: 2 }, PISO_Z, 1.2, { tone: "lo" }),
    ]),
  ], { class: "estrutura", "data-parte": "piso" }));

  // 1 · paredes de fundo (vistas pelo vidro) e o quadro na parede.
  camadas.push(k.groupSvg(ordenar([
    caixa({ x: 0, y: 0, w: 196, d: ESP, r: 0 }, 0, PE, { tone: "mid" }),
    caixa({ x: 0, y: ESP, w: ESP, d: PLANTA.d - 2 * ESP, r: 0 }, 0, PE, { tone: "mid" }),
    caixa({ x: 140, y: ESP, w: 28, d: 1, r: 0 }, 36, 18, { tone: "mid", className: "mat-escuro" }),
  ]), { class: "estrutura", "data-parte": "paredes" }));

  // 2 · tapete (deitado no piso, antes de tudo que fica sobre ele).
  camadas.push(k.groupSvg(caixa({ x: 112, y: 34, w: 74, d: 56, r: 1.5 }, 0, 0.8, { tone: "lo", className: "mat-tapete" }).svg,
    { class: "movel", "data-movel": "tapete" }));

  // 3 · móveis, ordenados entre si pelo centro.
  const tecido = { tone: "mid", className: "mat-tecido" };
  const madeira = { tone: "mid", className: "mat-madeira" };
  const sofa = grupo([
    ...[[121, 9], [171, 9], [121, 29], [171, 29]].map(([x, y]) => cilindro(x, y, 1.5, 0, 4, madeira)),
    caixa({ x: 118, y: 6, w: 56, d: 26, r: 1 }, 4, 6, tecido),
    caixa({ x: 124, y: 6, w: 44, d: 7, r: 1 }, 10, 20, tecido),
    caixa({ x: 125, y: 13, w: 21, d: 4, r: 1.5 }, 15, 13, tecido),
    caixa({ x: 146, y: 13, w: 21, d: 4, r: 1.5 }, 15, 13, tecido),
    caixa({ x: 124, y: 13, w: 22, d: 19, r: 1.5 }, 10, 5, tecido),
    caixa({ x: 146, y: 13, w: 22, d: 19, r: 1.5 }, 10, 5, tecido),
    caixa({ x: 118, y: 6, w: 6, d: 26, r: 1.5 }, 10, 12, tecido),
    caixa({ x: 168, y: 6, w: 6, d: 26, r: 1.5 }, 10, 12, tecido),
  ], { class: "movel", "data-movel": "sofa" }, [146, 19, 15]);
  const mesa = grupo([
    ...[[142, 46], [164, 46], [142, 56], [164, 56]].map(([x, y]) => cilindro(x, y, 1, 0, 12, madeira)),
    caixa({ x: 140, y: 44, w: 26, d: 14, r: 1 }, 12, 2, madeira),
    cilindro(149, 51, 2.5, 14, 6, { tone: "mid", className: "mat-plaqueta" }),
    caixa({ x: 155, y: 47, w: 7, d: 6, r: 0.5 }, 14, 1.5, { tone: "mid" }),
  ], { class: "movel", "data-movel": "mesa" }, [153, 51, 8]);
  const luminaria = grupo([
    cilindro(186, 14, 5, 0, 1.5, { tone: "mid", className: "mat-escuro" }),
    cilindro(186, 14, 1, 1.5, 54, { tone: "mid", className: "mat-escuro" }),
    cilindro(186, 14, 9, 54, 12, { tone: "mid", className: "mat-tapete" }),
  ], { class: "movel", "data-movel": "luminaria" }, [186, 14, 33]);
  const folha = { tone: "mid", className: "mat-folha" };
  const planta = grupo([
    cilindro(180, 78, 6, 0, 13, { tone: "mid", className: "mat-plaqueta" }),
    lamina(178, 77, 0.3, 3.2, 13, 24, folha),
    lamina(182, 79, 2.2, 3, 13, 18, folha),
    lamina(180, 80, 4.1, 2.8, 13, 28, folha),
  ], { class: "movel", "data-movel": "planta" }, [180, 78, 20]);
  camadas.push(ordenar([sofa, mesa, luminaria, planta]));

  // 4 · cinta recuada (atrás das plaquetas que a encostam).
  camadas.push(k.groupSvg(caixa({ x: BEIRAL, y: BEIRAL, w: PLANTA.w - 2 * BEIRAL, d: PLANTA.d - 2 * BEIRAL, r: 0 }, PE, CINTA,
    { tone: "mid", className: "mat-escuro" }).svg, { class: "estrutura", "data-parte": "cinta" }));

  // 5 · fileiras de plaqueta: muro da frente (y=140) + retorno (x=200). Quem é dono da quina pinta por último.
  for (let n = 0; n < FILEIRAS; n++) {
    const z0 = n * FIADA;
    const par = n % 2 === 0;
    const frente = { x: 0, y: PLANTA.d - ESP, w: par ? PLANTA.w : PLANTA.w - ESP, d: ESP, r: 0 };
    const retorno = { x: PLANTA.w - ESP, y: RETORNO, w: ESP, d: (par ? PLANTA.d - ESP : PLANTA.d) - RETORNO, r: 0 };
    const juntasFrente = (t) => JUNTAS_FRENTE[n % 2].filter((x) => x > t.x && x < t.x + t.w)
      .map((x) => k.segment([x, PLANTA.d, z0], [x, PLANTA.d, z0 + FIADA], P)).join("");
    const juntasRetorno = JUNTAS_RETORNO[n % 2].map((y) => k.segment([PLANTA.w, y, z0], [PLANTA.w, y, z0 + FIADA], P)).join("");
    const estilo = (juntas) => ({ tone: "lo", inner: k.lineSvg(juntas, { tone: "faint" }) });
    // A última fileira deixa o vão da plaqueta solta: dois trechos, cada um com as suas juntas.
    const trechos = n === FILEIRAS - 1
      ? [{ ...frente, w: SOLTA.x }, { ...frente, x: SOLTA.x + SOLTA.w, w: frente.w - SOLTA.x - SOLTA.w }]
      : [frente];
    // A plaqueta solta pinta entre os dois trechos: atrás do da direita, à frente do da esquerda.
    const a = trechos.map((t) => k.solidSvg(k.slabOf(t, z0, FIADA, P), estilo(juntasFrente(t))))
      .join(n === FILEIRAS - 1 ? `<g id="plaqueta-solta" class="mat-plaqueta">${k.solidSvg(k.slabOf(SOLTA, z0, FIADA, P), { tone: "lo" })}</g>` : "");
    const b = k.solidSvg(k.slabOf(retorno, z0, FIADA, P), estilo(juntasRetorno));
    camadas.push(`<g class="fileira mat-plaqueta" data-fileira="${n}">${par ? b + a : a + b}</g>`);
  }

  // 6 · pano de vidro: montantes de quina e de arranque, verga, peitoril, vidro com montantes e puxador da porta.
  const VIDRO = { x: PLANTA.w - 3, y: ESP, w: 2, d: RETORNO - 3 - ESP, r: 0 };
  const montantes = [29, 54, 79].map((y) => k.rise([VIDRO.x + VIDRO.w, y], 2, 92, P)).join("");
  const escuro = { tone: "mid", className: "mat-escuro" };
  camadas.push(k.groupSvg(ordenar([
    caixa({ x: PLANTA.w - ESP, y: 0, w: ESP, d: ESP, r: 0 }, 0, PE, escuro),
    caixa({ x: PLANTA.w - ESP, y: ESP, w: ESP + 1, d: RETORNO - ESP, r: 0 }, 0, 2, escuro),
    caixa({ x: PLANTA.w - ESP, y: ESP, w: ESP, d: RETORNO - ESP, r: 0 }, 92, PE - 92, escuro),
    { prof: prof([VIDRO.x, 54, 47]), svg: k.solidSvg(k.slabOf(VIDRO, 2, 90, P), { tone: "mid", className: "mat-vidro", inner: k.lineSvg(montantes, { tone: "mid" }) }) },
    caixa({ x: PLANTA.w - ESP, y: RETORNO - 3, w: ESP, d: 3, r: 0 }, 0, PE, escuro),
    { ...caixa({ x: PLANTA.w - 1, y: 56, w: 1.2, d: 1.2, r: 0 }, 26, 36, escuro), prof: Infinity }, // puxador da porta, por fora do vidro
  ]), { class: "vidro" }));

  // 7 · cobertura com rufo, por cima de tudo que é estrutura.
  const celulas = (pl, z) => [
    ...[1, 2].map((i) => k.lineOnTop([pl.x + (pl.w * i) / 3, pl.y], [pl.x + (pl.w * i) / 3, pl.y + pl.d], z, P)),
    k.lineOnTop([pl.x, pl.y + pl.d / 2], [pl.x + pl.w, pl.y + pl.d / 2], z, P),
  ].join("");
  camadas.push(k.groupSvg([k.solidSvg(k.slabOf(PLANO_COB, COB_Z, COBERTURA, P), {
    tone: "mid", className: "mat-cobertura", inner: k.lineSvg(k.planOutline(k.insetPlan(PLANO_COB, 4), COB_Z + COBERTURA, P, 2), { tone: "faint" }),
  }), ordenar(PAINEIS.map((pl) => caixa(pl, COB_Z + COBERTURA, 1.5, {
    tone: "mid", className: "mat-solar", inner: k.lineSvg(celulas(pl, COB_Z + COBERTURA + 1.5), { tone: "lo" }),
  })))], { class: "estrutura", "data-parte": "cobertura" }));

  // 8 · jardim na frente do muro e arandela no retorno.
  camadas.push(k.groupSvg(ordenar([
    caixa({ x: 24, y: PLANTA.d + 6, w: 72, d: 12, r: 1 }, PISO_Z, 14, { tone: "mid" }),
    caixa({ x: 26, y: PLANTA.d + 8, w: 68, d: 8, r: 0.5 }, 7.6, 0.6, { tone: "lo", className: "mat-escuro" }),
    ...[36, 60, 84].flatMap((x, i) => [[-2.5, 0.4, 22], [2.5, 2.3, 17], [0, 4.2, 28]]
      .map(([dx, ang, h]) => lamina(x + dx, PLANTA.d + 11 + (dx ? 0 : 2), ang + i, 4, 8.2, h - 3 * i, folha))),
    caixa({ x: PLANTA.w, y: 117, w: 2.5, d: 5, r: 0.5 }, 58, 8, escuro),
    caixa({ x: PLANTA.w, y: 126, w: 0.8, d: 8, r: 0 }, 46, 5, escuro),
  ]), { class: "estrutura", "data-parte": "jardim" }));

  const cantos = k.boxCorners(SOLTA, PE - FIADA, PE).map((p) => k.iso(p, P));
  const xs = cantos.map(([x]) => x);
  const ys = cantos.map(([, y]) => y);
  const plaquetaSolta = { sx: r1(Math.min(...xs)), sy: r1(Math.min(...ys)), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(Math.max(...ys) - Math.min(...ys)) };

  return {
    svg: k.figureSvg({ width: LARGURA, height: ALTURA, label: ROTULO, body: camadas.join("") }),
    meta: { fileiras: FILEIRAS, moveis: ["tapete", "sofa", "mesa", "luminaria", "planta"], plaquetaSolta },
  };
}
