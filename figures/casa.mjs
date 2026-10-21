// Geometria da casa isométrica do hero (Node, sem DOM). Uso: casa() → { svg, meta }.
// Mundo em centímetros: x e y no chão, z para cima. Casa térrea de 10 × 5 m com pé-direito de 3 m,
// para a plaqueta (24 × 7 cm) ler pequena contra a porta e os móveis. A face y = PLANTA.d é o muro
// comprido (frente-esquerda); a face x = PLANTA.w tem o pano de vidro e um retorno de plaqueta junto à quina.
import * as k from "./kit/iso-kit.mjs";

const LARGURA = 900;
const ROTULO = "Casa moderna de um pavimento revestida em plaqueta de barro, com sala mobiliada vista pelo pano de vidro";

const PLANTA = { x: 0, y: 0, w: 1000, d: 500, r: 0 };
const PISO_Z = -15;
const FIADA = 8; // plaqueta de 7 cm + junta de 1 cm
const FILEIRAS = 37; // 37 × 8 = 296 cm de pé-direito
const PE = FIADA * FILEIRAS;
const PECA = 25; // plaqueta de 24 cm + junta de 1 cm
const ESP = 15; // espessura dos muros
const RETORNO = 340; // na face x = PLANTA.w, o vidro vai até y = 340 e daí até a quina é plaqueta
const VAO = 260; // altura do pano de vidro e da porta
const CINTA = 20; // viga recuada que forma a fresta de sombra sob a cobertura
const BEIRAL = 40;
const COBERTURA = 20;
const COB_Z = PE + CINTA;
const X0 = PLANTA.w; // a sala fica junto ao pano de vidro: móveis medidos a partir dele
const CLARABOIA = { x: X0 - 320, y: 160, w: 120, d: 80, r: 0 };
const PLANO_COB = { x: -BEIRAL, y: -BEIRAL, w: PLANTA.w + 2 * BEIRAL, d: PLANTA.d + 2 * BEIRAL, r: 0 };
const DECK = { x: PLANTA.w, y: 20, w: 120, d: RETORNO - 20, r: 0 };

// Juntas verticais a cada 25 cm; fileiras ímpares deslocadas meia peça (amarração corrida).
const juntas = (fim, inicio, desloc) => {
  const xs = [];
  for (let v = fim - PECA - desloc; v > inicio; v -= PECA) xs.push(v);
  return xs;
};
const JUNTAS_FRENTE = [juntas(PLANTA.w, 0, 0), juntas(PLANTA.w, 0, PECA / 2)];
const JUNTAS_RETORNO = [juntas(PLANTA.d, RETORNO, 0), juntas(PLANTA.d, RETORNO, PECA / 2)];
// Vão da plaqueta solta na última fileira (par): entre duas juntas, 24 cm de peça.
const SOLTA_X = JUNTAS_FRENTE[(FILEIRAS - 1) % 2][23];
const SOLTA = { x: SOLTA_X, y: PLANTA.d - ESP, w: PECA, d: ESP, r: 0 };

// Fachada longa (y = PLANTA.d): duas janelas altas e um vão de entrada envidraçado perto da ponta x = 0.
const JANELAS = [420, 640].map((x) => ({ x, w: 60, z: 40, h: 220 }));
const ENTRADA = { x: 70, w: 170, z: 0, h: 260 };
// Mureta de plaqueta de 60 cm à frente da fachada, aberta no caminho da entrada.
const MURETA_Y = PLANTA.d + 130;
const MURETA = [{ x: -60, w: 150 }, { x: 230, w: 640 }].map(({ x, w }) => ({ x, y: MURETA_Y, w, d: 15, r: 0 }));
const MURETA_H = 64; // 8 fiadas
// Placa de chão na mesma projeção: 150 cm além da casa, do deck e da mureta, em todos os lados.
const PLACA = { x: -150, y: -150, w: PLANTA.w + DECK.w + 300, d: MURETA_Y + 15 + 150 + 150, r: 0 };
const PLACA_Z = PISO_Z - 2;
// Sombra projetada no plano da placa: luz vinda da direita e de trás, sombra para a esquerda e para a frente.
// Comprimento escolhido para a sombra do beiral (351 cm acima da placa) ficar dentro da placa.
const SOMBRA = [-0.28, 0.32]; // deslocamento em planta por cm de altura

const r1 = (n) => Math.round(n * 10) / 10;
const PEGADA = k.boxCorners(PLACA, PLACA_Z, PISO_Z);

// Casco convexo (cadeia monótona) dos pontos de planta: contorno da sombra.
function casco(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const meia = (lista) => lista.reduce((h, q) => { while (h.length > 1 && giro(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); return h; }, []);
  const baixo = meia(p);
  const cima = meia([...p].reverse());
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)];
}

// Câmera girada para o muro comprido e baixa o bastante para a casa com a placa de chão caber larga (≥ 65 % da célula) na dobra.
const CAMERA = { azimuth: 50, elevation: 20 };
const PAD = 4;
const ENQUADRA = [...k.boxCorners(PLANTA, PISO_Z, PE), ...k.boxCorners(PLANO_COB, COB_Z, COB_Z + COBERTURA), ...PEGADA];
// Altura do viewBox justa ao desenho: o svg não carrega folga própria, quem centra é a célula.
const ALTURA = (() => {
  const f = ENQUADRA.map((p) => k.iso(p, { origin: [0, 0], scale: 1, ...CAMERA }));
  const [xs, ys] = [f.map(([x]) => x), f.map(([, y]) => y)];
  return Math.round((LARGURA - 2 * PAD) * (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs)) + 2 * PAD);
})();

export function casa() {
  const P = k.fitProjection(ENQUADRA, LARGURA, ALTURA, { pad: PAD, ...CAMERA });
  const prof = (p) => k.depthOf(p, P);
  const meio = (plan, z, h) => [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];

  // Cada peça é { prof, svg }; ordenar() pinta de trás para frente.
  const caixa = (plan, z, h, estilo = {}) => ({
    prof: prof(meio(plan, z, h)),
    svg: k.solidSvg(k.slabOf(plan, z, h, P, 3), estilo),
  });
  const cilindro = (cx, cy, raio, z, h, estilo = {}) => ({
    prof: prof([cx, cy, z + h / 2]),
    svg: k.solidSvg(k.cylinder(cx, cy, raio, z, h, P, raio > 15 ? 28 : 16), estilo),
  });
  const lamina = (cx, cy, ang, larg, z, h, estilo) => {
    const [c, s] = [Math.cos(ang), Math.sin(ang)];
    const ring = [[-larg, 0], [larg, 0], [0, larg * 0.35]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
    return { prof: prof([cx, cy, z + h / 2]), svg: k.solidSvg(k.extrude(ring, z, h, P), estilo) };
  };
  const ordenar = (pecas) => [...pecas].sort((a, b) => a.prof - b.prof).map((p) => p.svg).join("");
  const grupo = (pecas, attrs, centro) => ({ prof: prof(centro), svg: k.groupSvg(ordenar(pecas), attrs) });

  const camadas = [];

  // 0 · placa de chão, sombra projetada, piso e deck (o deck é o degrau da porta). A base da casa assenta na placa.
  const topoCob = COB_Z + COBERTURA;
  const projeta = ([x, y], h) => [x + SOMBRA[0] * h, y + SOMBRA[1] * h];
  const cantosPlanta = (pl) => [[pl.x, pl.y], [pl.x + pl.w, pl.y], [pl.x + pl.w, pl.y + pl.d], [pl.x, pl.y + pl.d]];
  const sombra = casco([
    ...cantosPlanta(PLANTA), ...cantosPlanta(PLANO_COB).map((q) => projeta(q, topoCob - PISO_Z)),
  ]);
  const sombraMureta = MURETA.map((m) => casco([...cantosPlanta(m), ...cantosPlanta(m).map((q) => projeta(q, MURETA_H))]));
  const caminho = (pts) => k.pathOf(pts.map(([x, y]) => k.iso([x, y, PISO_Z], P)), true);
  const tabuas = Array.from({ length: Math.floor(DECK.d / 15) - 1 }, (_, i) =>
    k.lineOnTop([DECK.x, DECK.y + 15 * (i + 1)], [DECK.x + DECK.w, DECK.y + 15 * (i + 1)], 0, P)).join("");
  camadas.push(k.groupSvg([
    k.solidSvg(k.slabOf(PLACA, PLACA_Z, PISO_Z - PLACA_Z, P), { tone: "lo", className: "mat-chao" }),
    `<path class="sombra" d="${caminho(sombra)}${sombraMureta.map(caminho).join("")}"/>`,
    ordenar([
      caixa(PLANTA, PISO_Z, -PISO_Z, { tone: "mid" }),
      caixa(DECK, PISO_Z, -PISO_Z, { tone: "mid", className: "mat-cobertura", inner: k.lineSvg(tabuas, { tone: "lo" }) }),
    ]),
  ], { class: "estrutura", "data-parte": "piso" }));

  // 1 · paredes de fundo (vistas pelo vidro) e o quadro na parede.
  camadas.push(k.groupSvg(ordenar([
    caixa({ x: 0, y: 0, w: PLANTA.w - ESP, d: ESP, r: 0 }, 0, PE, { tone: "mid" }),
    caixa({ x: 0, y: ESP, w: ESP, d: PLANTA.d - 2 * ESP, r: 0 }, 0, PE, { tone: "mid" }),
    caixa({ x: X0 - 230, y: ESP, w: 100, d: 3, r: 0 }, 130, 70, { tone: "mid", className: "mat-escuro" }),
  ]), { class: "estrutura", "data-parte": "paredes" }));

  // 2 · tapete (deitado no piso, antes de tudo que fica sobre ele).
  camadas.push(k.groupSvg(caixa({ x: X0 - 300, y: 130, w: 260, d: 190, r: 4 }, 0, 1.5, { tone: "lo", className: "mat-tapete" }).svg,
    { class: "movel", "data-movel": "tapete" }));

  // 3 · móveis em escala real (sofá 220 × 90 × 80, mesa de centro 100 × 50 × 40, luminária de 160 cm).
  // Só a parede de plaqueta tem cor: madeira e folhagem em tinta, estofado e vaso em neutro quente.
  const tecido = { tone: "mid", className: "mat-tecido" };
  const madeira = { tone: "mid", className: "mat-escuro" };
  const SX = X0 - 270; // sofá encostado na parede do fundo (y = ESP), de frente para o jardim
  const sofa = grupo([
    ...[[10, 10], [210, 10], [10, 80], [210, 80]].map(([x, y]) => cilindro(SX + x, ESP + y, 3, 0, 12, madeira)),
    caixa({ x: SX, y: ESP, w: 220, d: 90, r: 3 }, 12, 20, tecido), // base
    caixa({ x: SX + 18, y: ESP, w: 184, d: 22, r: 3 }, 32, 48, tecido), // encosto
    caixa({ x: SX + 18, y: ESP + 22, w: 92, d: 62, r: 4 }, 32, 12, tecido), // assentos
    caixa({ x: SX + 110, y: ESP + 22, w: 92, d: 62, r: 4 }, 32, 12, tecido),
    caixa({ x: SX, y: ESP, w: 18, d: 90, r: 3 }, 32, 30, tecido), // braços
    caixa({ x: SX + 202, y: ESP, w: 18, d: 90, r: 3 }, 32, 30, tecido),
  ], { class: "movel", "data-movel": "sofa" }, [SX + 110, ESP + 45, 40]);
  const MX = X0 - 220;
  const mesa = grupo([
    ...[[6, 6], [94, 6], [6, 44], [94, 44]].map(([x, y]) => cilindro(MX + x, 180 + y, 2.5, 0, 36, madeira)),
    caixa({ x: MX, y: 180, w: 100, d: 50, r: 2 }, 36, 4, madeira),
    cilindro(MX + 30, 205, 8, 40, 22, { tone: "mid", className: "mat-cobertura" }),
    caixa({ x: MX + 55, y: 192, w: 26, d: 20, r: 1 }, 40, 5, { tone: "mid" }),
  ], { class: "movel", "data-movel": "mesa" }, [MX + 50, 205, 20]);
  const luminaria = grupo([
    cilindro(X0 - 40, ESP + 40, 16, 0, 3, madeira),
    cilindro(X0 - 40, ESP + 40, 2, 3, 130, madeira),
    cilindro(X0 - 40, ESP + 40, 22, 130, 30, { tone: "mid", className: "mat-tapete" }),
  ], { class: "movel", "data-movel": "luminaria" }, [X0 - 40, ESP + 40, 80]);
  const folha = { tone: "mid", className: "mat-escuro" }; // folhagem em silhueta de tinta
  const planta = grupo([
    cilindro(X0 - 50, 290, 20, 0, 45, { tone: "mid", className: "mat-cobertura" }),
    lamina(X0 - 54, 288, 0.3, 12, 45, 70, folha),
    lamina(X0 - 46, 292, 2.2, 11, 45, 55, folha),
    lamina(X0 - 50, 294, 4.1, 10, 45, 85, folha),
  ], { class: "movel", "data-movel": "planta" }, [X0 - 50, 290, 60]);
  camadas.push(ordenar([sofa, mesa, luminaria, planta]));

  // 4 · cinta recuada (atrás das plaquetas que a encostam).
  camadas.push(k.groupSvg(caixa({ x: BEIRAL, y: BEIRAL, w: PLANTA.w - 2 * BEIRAL, d: PLANTA.d - 2 * BEIRAL, r: 0 }, PE, CINTA,
    { tone: "mid", className: "mat-escuro" }).svg, { class: "estrutura", "data-parte": "cinta" }));

  // 5 · fileiras de plaqueta: muro da frente (y = d) + retorno (x = w). Quem é dono da quina pinta por último.
  // Uma laje por muro e por fileira (o contorno da laje é a junta horizontal); juntas verticais em linha fina.
  for (let n = 0; n < FILEIRAS; n++) {
    const z0 = n * FIADA;
    const par = n % 2 === 0;
    const frente = { x: 0, y: PLANTA.d - ESP, w: par ? PLANTA.w : PLANTA.w - ESP, d: ESP, r: 0 };
    const retorno = { x: PLANTA.w - ESP, y: RETORNO, w: ESP, d: (par ? PLANTA.d - ESP : PLANTA.d) - RETORNO, r: 0 };
    const juntasFrente = (t) => JUNTAS_FRENTE[n % 2].filter((x) => x > t.x && x < t.x + t.w)
      .map((x) => k.segment([x, PLANTA.d, z0], [x, PLANTA.d, z0 + FIADA], P)).join("");
    const juntasRetorno = JUNTAS_RETORNO[n % 2].map((y) => k.segment([PLANTA.w, y, z0], [PLANTA.w, y, z0 + FIADA], P)).join("");
    const estilo = (linhas) => ({ tone: "lo", inner: k.lineSvg(linhas, { tone: "faint" }) });
    // A última fileira deixa o vão da plaqueta solta: dois trechos, cada um com as suas juntas.
    const ultima = n === FILEIRAS - 1;
    const trechos = ultima
      ? [{ ...frente, w: SOLTA.x }, { ...frente, x: SOLTA.x + SOLTA.w, w: frente.w - SOLTA.x - SOLTA.w }]
      : [frente];
    // A plaqueta solta pinta entre os dois trechos: atrás do da direita, à frente do da esquerda.
    const a = trechos.map((t) => k.solidSvg(k.slabOf(t, z0, FIADA, P), estilo(juntasFrente(t))))
      .join(ultima ? `<g id="plaqueta-solta" class="mat-plaqueta">${k.solidSvg(k.slabOf(SOLTA, z0, FIADA, P), { tone: "lo" })}</g>` : "");
    const b = k.solidSvg(k.slabOf(retorno, z0, FIADA, P), estilo(juntasRetorno));
    camadas.push(`<g class="fileira mat-plaqueta" data-fileira="${n}">${par ? b + a : a + b}</g>`);
  }

  // 5b · vãos da fachada longa, à frente das fiadas: requadro em tinta, vidro neutro e peitoril.
  const vaos = [];
  for (const j of JANELAS) {
    vaos.push(k.solidSvg(k.slabOf({ x: j.x, y: PLANTA.d, w: j.w, d: 3, r: 0 }, j.z, j.h, P), { tone: "mid", className: "mat-escuro" }));
    vaos.push(k.solidSvg(k.slabOf({ x: j.x + 6, y: PLANTA.d + 3, w: j.w - 12, d: 1, r: 0 }, j.z + 6, j.h - 12, P), { tone: "mid", className: "mat-vidro" }));
    vaos.push(k.solidSvg(k.slabOf({ x: j.x - 6, y: PLANTA.d, w: j.w + 12, d: 8, r: 0 }, j.z - 5, 5, P), { tone: "mid", className: "mat-cobertura" }));
  }
  const portaY = PLANTA.d + 3;
  const travessas = [ENTRADA.x + 90].map((x) => k.segment([x, portaY + 1, ENTRADA.z + 6], [x, portaY + 1, ENTRADA.h - 6], P)).join("");
  vaos.push(k.solidSvg(k.slabOf({ x: ENTRADA.x, y: PLANTA.d, w: ENTRADA.w, d: 3, r: 0 }, ENTRADA.z, ENTRADA.h, P), { tone: "mid", className: "mat-escuro" }));
  vaos.push(k.solidSvg(k.slabOf({ x: ENTRADA.x + 6, y: portaY, w: ENTRADA.w - 12, d: 1, r: 0 }, ENTRADA.z + 6, ENTRADA.h - 12, P),
    { tone: "mid", className: "mat-vidro", inner: k.lineSvg(travessas, { tone: "mid" }) }));
  camadas.push(k.groupSvg(vaos.join(""), { class: "vidro" }));

  // 6 · pano de vidro de 2,6 m: montantes de quina e de arranque, verga, peitoril, vidro com montantes e puxador da porta.
  const VIDRO = { x: PLANTA.w - 8, y: ESP, w: 4, d: RETORNO - 8 - ESP, r: 0 };
  const montantes = [95, 175, 255].map((y) => k.rise([VIDRO.x + VIDRO.w, y], 4, VAO - 4, P)).join("");
  const escuro = { tone: "mid", className: "mat-escuro" };
  camadas.push(k.groupSvg(ordenar([
    caixa({ x: PLANTA.w - ESP, y: 0, w: ESP, d: ESP, r: 0 }, 0, PE, escuro),
    caixa({ x: PLANTA.w - ESP, y: ESP, w: ESP + 2, d: RETORNO - ESP, r: 0 }, 0, 4, escuro),
    caixa({ x: PLANTA.w - ESP, y: ESP, w: ESP, d: RETORNO - ESP, r: 0 }, VAO, PE - VAO, escuro),
    { prof: prof([VIDRO.x, 175, VAO / 2]), svg: k.solidSvg(k.slabOf(VIDRO, 4, VAO - 4, P), { tone: "mid", className: "mat-vidro", inner: k.lineSvg(montantes, { tone: "mid" }) }) },
    caixa({ x: PLANTA.w - ESP, y: RETORNO - 8, w: ESP, d: 8, r: 0 }, 0, PE, escuro),
    { ...caixa({ x: PLANTA.w - 2, y: 170, w: 2, d: 3, r: 0 }, 95, 30, escuro), prof: Infinity }, // puxador no montante da porta, por fora do vidro
  ]), { class: "vidro" }));

  // 7 · cobertura neutra; a linha da testeira em volta do beiral é tinta (o acento fica para o CTA). Clarabóia em cinza quente.
  const topo = COB_Z + COBERTURA;
  camadas.push(k.groupSvg([
    k.solidSvg(k.slabOf(PLANO_COB, COB_Z, COBERTURA, P), {
      tone: "mid", className: "mat-cobertura",
      inner: k.lineSvg(k.sideSeam(PLANO_COB, COB_Z + COBERTURA / 2, P, 2), { tone: "hi" })
        + k.lineSvg(k.planOutline(k.insetPlan(PLANO_COB, 12), topo, P, 2), { tone: "faint" }),
    }),
    k.solidSvg(k.slabOf(CLARABOIA, topo, 10, P), { tone: "mid" }),
    k.solidSvg(k.slabOf(k.insetPlan(CLARABOIA, 10), topo + 10, 2, P), { tone: "lo", className: "mat-vidro" }),
  ], { class: "estrutura", "data-parte": "cobertura" }));

  // 8 · mureta de plaqueta (8 fiadas) à frente da fachada, aberta no caminho da entrada.
  const fiadasMureta = (m) => {
    const yF = m.y + m.d;
    const horiz = Array.from({ length: MURETA_H / FIADA - 1 }, (_, i) => k.segment([m.x, yF, (i + 1) * FIADA], [m.x + m.w, yF, (i + 1) * FIADA], P));
    const vert = Array.from({ length: MURETA_H / FIADA }, (_, i) => juntas(m.x + m.w, m.x, i % 2 ? PECA / 2 : 0)
      .map((x) => k.segment([x, yF, i * FIADA], [x, yF, (i + 1) * FIADA], P))).flat();
    return [...horiz, ...vert].join("");
  };
  camadas.push(k.groupSvg(ordenar(MURETA.map((m) => ({
    prof: prof(meio(m, PISO_Z, MURETA_H)),
    svg: k.solidSvg(k.slabOf(m, PISO_Z, MURETA_H - PISO_Z, P), { tone: "lo", className: "mat-plaqueta", inner: k.lineSvg(fiadasMureta(m), { tone: "faint" }) }),
  }))), { class: "estrutura", "data-parte": "jardim" }));

  const cantos = k.boxCorners(SOLTA, PE - FIADA, PE).map((p) => k.iso(p, P));
  const xs = cantos.map(([x]) => x);
  const ys = cantos.map(([, y]) => y);
  const plaquetaSolta = { sx: r1(Math.min(...xs)), sy: r1(Math.min(...ys)), w: r1(Math.max(...xs) - Math.min(...xs)), h: r1(Math.max(...ys) - Math.min(...ys)) };

  return {
    svg: k.figureSvg({ width: LARGURA, height: ALTURA, label: ROTULO, body: camadas.join("") }),
    meta: { fileiras: FILEIRAS, moveis: ["tapete", "sofa", "mesa", "luminaria", "planta"], plaquetaSolta },
  };
}
