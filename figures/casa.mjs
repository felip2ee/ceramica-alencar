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
const ENTRADA = { x: 70, w: 170, z: 0, h: 240 }; // 240 cm = 30 fiadas de 8 cm
// Mureta de plaqueta de 64 cm à frente da fachada, aberta no caminho da entrada. Na câmera rasa a mureta
// (130 cm à frente) aparece ~84 cm à esquerda do que tapa: a abertura vai de 130 a 330 para cair diante do vão.
const MURETA_Y = PLANTA.d + 130;
const MURETA = [{ x: -60, w: 190 }, { x: 330, w: 540 }].map(({ x, w }) => ({ x, y: MURETA_Y, w, d: 15, r: 0 }));
const MURETA_H = 64; // 8 fiadas
// Placa de chão na mesma projeção: 80 cm além da casa, do deck e da mureta (margem curta: a casa enche a célula).
const MARGEM = 80;
const PLACA = { x: -60 - MARGEM, y: -MARGEM, w: PLANTA.w + DECK.w + 60 + 2 * MARGEM, d: MURETA_Y + 15 + 2 * MARGEM, r: 0 };
const HACHURA = 6; // cm entre linhas de hachura, medidos no plano da superfície
const PLACA_Z = PISO_Z - 2;
// Sombra projetada no plano da placa: luz vinda da direita e de trás, sombra para a esquerda e para a frente.
// Sol alto: sombra curta e chata, rente à base, dentro da placa.
const SOMBRA = [-0.16, 0.18]; // deslocamento em planta por cm de altura

const r1 = (n) => Math.round(n * 10) / 10;
const PEGADA = k.boxCorners(PLACA, PLACA_Z, PISO_Z);

// Recorta o segmento a–b ao polígono convexo (Cyrus–Beck); null se ficar fora.
function recorta(a, b, poli) {
  const giro = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const s = poli.reduce((acc, p, i) => acc + giro([0, 0], p, poli[(i + 1) % poli.length]), 0) > 0 ? 1 : -1;
  let [t0, t1] = [0, 1];
  for (let i = 0; i < poli.length; i++) {
    const [e, f] = [poli[i], poli[(i + 1) % poli.length]];
    const num = s * giro(e, f, a);
    const den = s * ((f[0] - e[0]) * (b[1] - a[1]) - (f[1] - e[1]) * (b[0] - a[0]));
    if (Math.abs(den) < 1e-9) { if (num < 0) return null; continue; }
    const t = -num / den;
    if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 >= t1) return null;
  }
  const em = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return [em(t0), em(t1)];
}
// Hachura a 45° dentro de um polígono convexo 2D: linhas paralelas a cada `passo`, terminando nas bordas.
function hachura(poli, passo) {
  const c = poli.map(([u, v]) => u - v);
  const [lo, hi] = [Math.min(...c), Math.max(...c)];
  const ext = Math.max(...poli.flat().map(Math.abs)) * 4;
  const linhas = [];
  for (let k0 = Math.ceil(lo / passo) * passo; k0 <= hi; k0 += passo) {
    const seg = recorta([k0 - ext, -ext], [k0 + ext, ext], poli);
    if (seg) linhas.push(seg);
  }
  return linhas;
}
console.assert(recorta([-1, 0.5], [2, 0.5], [[0, 0], [1, 0], [1, 1], [0, 1]]).flat().join() === "0,0.5,1,0.5", "recorta");
console.assert(hachura([[0, 0], [10, 0], [10, 10], [0, 10]], 2).length === 9, "hachura");

// Tom de cada plaqueta (determinístico): 0 claro (cor da face), 1 médio, 2 queimado, 3 escuro — a parede mostra os tons do produto.
const TOM = (n, i) => {
  const h = (((Math.sin(n * 12.9898 + i * 78.233) * 43758.5453) % 1) + 1) % 1;
  return h < 0.4 ? 0 : h < 0.72 ? 1 : h < 0.88 ? 2 : 3;
};
// Peças de uma fiada entre x0 e x1, cortadas nas juntas: [[a, b], ...].
const pecas = (x0, x1, js) => {
  const cortes = [x0, ...js.filter((x) => x > x0 && x < x1).sort((a, b) => a - b), x1];
  return cortes.slice(1).map((b, i) => [cortes[i], b]);
};

// Casco convexo (cadeia monótona) dos pontos de planta: contorno da sombra.
function casco(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const meia = (lista) => lista.reduce((h, q) => { while (h.length > 1 && giro(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); return h; }, []);
  const baixo = meia(p);
  const cima = meia([...p].reverse());
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)];
}

// Dimétrica rasa: elevação de 9° deixa a cobertura num friso fino e a fachada de plaqueta dominante;
// azimute 57° (33° fora da normal do muro comprido, convenção do kit: 90° = muro comprido de frente).
const CAMERA = { azimuth: 57, elevation: 9 };
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
  // Desenho num plano de face: f([u, v]) → ponto 3D. Retângulo fechado, hachura recortada e tons de plaqueta.
  const faceY = (Y) => ([u, v]) => [u, Y, v];
  const faceX = (X) => ([u, v]) => [X, u, v];
  const quad = (f, u0, v0, u1, v1) => k.pathOf([[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map((q) => k.iso(f(q), P)), true);
  const hachuraFace = (f, poli, passo = HACHURA) => hachura(poli, passo).map(([a, b]) => k.segment(f(a), f(b), P)).join("");
  const tons = (f, n, faixas, v0, v1) => [1, 2, 3].map((t) => {
    const d = faixas.filter(([, , i]) => TOM(n, i) === t).map(([a, b]) => quad(f, a, v0, b, v1)).join("");
    return d ? `<path class="tom-${t}" d="${d}"/>` : "";
  }).join("");

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
    k.lineSvg([sombra, ...sombraMureta].flatMap((pl) => hachura(pl, HACHURA))
      .map(([a, b]) => k.segment([...a, PISO_Z], [...b, PISO_Z], P)).join(""), { className: "hachura" }),
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
  // Corre a fachada inteira, recuada 15 cm: a fresta de sombra sob a laje não muda de estado no meio do muro.
  camadas.push(k.groupSvg(caixa({ x: 0, y: 0, w: PLANTA.w - ESP, d: PLANTA.d - ESP, r: 0 }, PE, CINTA,
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
    const tonsFrente = (t) => tons(faceY(PLANTA.d), n, pecas(t.x, t.x + t.w, JUNTAS_FRENTE[n % 2]).map(([a, b]) => [a, b, Math.round(a)]), z0, z0 + FIADA);
    const juntasRetorno = JUNTAS_RETORNO[n % 2].map((y) => k.segment([PLANTA.w, y, z0], [PLANTA.w, y, z0 + FIADA], P)).join("");
    const estilo = (linhas, cor = "") => ({ tone: "lo", inner: cor + k.lineSvg(linhas, { tone: "faint" }) });
    // A última fileira deixa o vão da plaqueta solta: dois trechos, cada um com as suas juntas.
    const ultima = n === FILEIRAS - 1;
    const trechos = ultima
      ? [{ ...frente, w: SOLTA.x }, { ...frente, x: SOLTA.x + SOLTA.w, w: frente.w - SOLTA.x - SOLTA.w }]
      : [frente];
    // A plaqueta solta pinta entre os dois trechos: atrás do da direita, à frente do da esquerda.
    const a = trechos.map((t) => k.solidSvg(k.slabOf(t, z0, FIADA, P), estilo(juntasFrente(t), tonsFrente(t))))
      .join(ultima ? `<g id="plaqueta-solta" class="mat-plaqueta">${k.solidSvg(k.slabOf(SOLTA, z0, FIADA, P), { tone: "lo" })}</g>` : "");
    const b = k.solidSvg(k.slabOf(retorno, z0, FIADA, P), estilo(juntasRetorno));
    camadas.push(`<g class="fileira mat-plaqueta" data-fileira="${n}">${par ? b + a : a + b}</g>`);
  }

  // 5a · hachura de sombra na face curta de plaqueta (x = PLANTA.w), em (y, z), por cima das fiadas.
  const faceCurta = [[RETORNO, 0], [PLANTA.d, 0], [PLANTA.d, PE], [RETORNO, PE]];
  camadas.push(k.groupSvg(k.lineSvg(hachura(faceCurta, HACHURA)
    .map(([a, b]) => k.segment([PLANTA.w, a[0], a[1]], [PLANTA.w, b[0], b[1]], P)).join(""), { className: "hachura" }),
  { class: "estrutura", "data-parte": "paredes" }));

  // 5b · vãos da fachada longa, à frente das fiadas: caixilho de 4 cm em tinta, verga e peitoril em neutro,
  // vidro com o requadro interno (segundo retângulo), hachura de sombra no alto e à esquerda e um reflexo diagonal por folha.
  const vaos = [];
  const CX = 4; // profundidade do caixilho
  const vidroFace = faceY(PLANTA.d + CX + 1);
  const folhaVidro = (u0, v0, u1, v1) => {
    const R = 5; // largura do requadro interno visto no vidro
    const linhas = [
      k.lineSvg(quad(vidroFace, u0 + R, v0 + R, u1 - R, v1 - R), { tone: "mid" }),
      k.lineSvg(hachuraFace(vidroFace, [[u0, v1 - R], [u1, v1 - R], [u1, v1], [u0, v1]], 4)
        + hachuraFace(vidroFace, [[u0, v0], [u0 + R, v0], [u0 + R, v1 - R], [u0, v1 - R]], 4), { className: "hachura" }),
      k.lineSvg(k.segment(vidroFace([u0 + R + (u1 - u0) * 0.15, v0 + R + (v1 - v0) * 0.25]), vidroFace([u1 - R - (u1 - u0) * 0.1, v0 + R + (v1 - v0) * 0.62]), P), { className: "reflexo" }),
    ];
    return linhas.join("");
  };
  const vao = ({ x, w, z, h }, folhas, { peitoril }) => {
    const pecasVao = [
      k.solidSvg(k.slabOf({ x, y: PLANTA.d, w, d: CX, r: 0 }, z, h, P), { tone: "mid", className: "mat-escuro" }),
      k.solidSvg(k.slabOf({ x: x + 6, y: PLANTA.d + CX, w: w - 12, d: 1, r: 0 }, z + 6, h - 12, P), {
        tone: "mid", className: "mat-vidro",
        inner: folhas.map(([a, b]) => folhaVidro(a, z + 6, b, z + h - 6)).join("")
          + k.lineSvg(folhas.slice(1).map(([a]) => k.segment(vidroFace([a, z + 6]), vidroFace([a, z + h - 6]), P)).join(""), { tone: "hi" }),
      }),
      k.solidSvg(k.slabOf({ x: x - 6, y: PLANTA.d, w: w + 12, d: CX + 3, r: 0 }, z + h, 6, P), { tone: "mid", className: "mat-cobertura" }), // verga
    ];
    if (peitoril) pecasVao.push(k.solidSvg(k.slabOf({ x: x - 6, y: PLANTA.d, w: w + 12, d: CX + 6, r: 0 }, z - 5, 5, P), { tone: "mid", className: "mat-cobertura" }));
    else pecasVao.push(k.solidSvg(k.slabOf({ x: x - 4, y: PLANTA.d, w: w + 8, d: 14, r: 0 }, PISO_Z, -PISO_Z + 2, P), { tone: "mid", className: "mat-cobertura" })); // soleira
    return pecasVao.join("");
  };
  for (const j of JANELAS) vaos.push(vao(j, [[j.x + 6, j.x + j.w - 6]], { peitoril: true }));
  const MEIO = ENTRADA.x + ENTRADA.w / 2;
  vaos.push(vao(ENTRADA, [[ENTRADA.x + 6, MEIO], [MEIO, ENTRADA.x + ENTRADA.w - 6]], { peitoril: false }));
  camadas.push(k.groupSvg(vaos.join(""), { class: "vidro" }));

  // 6 · pano de vidro de 2,6 m: montantes de quina e de arranque, verga, peitoril, vidro com montantes e puxador da porta.
  const VIDRO = { x: PLANTA.w - 8, y: ESP, w: 4, d: RETORNO - 8 - ESP, r: 0 };
  const escuro = { tone: "mid", className: "mat-escuro" };
  const panos = [ESP, 95, 175, 255, RETORNO - 8];
  const vidroBay = faceX(VIDRO.x + VIDRO.w);
  const reflexos = panos.slice(1).map((b, i) => {
    const a = panos[i];
    return k.segment(vidroBay([a + (b - a) * 0.2, 4 + (VAO - 8) * 0.3]), vidroBay([b - (b - a) * 0.15, 4 + (VAO - 8) * 0.7]), P);
  }).join("");
  const trilhos = [PLANTA.w - 10, PLANTA.w - 5].map((x) => k.lineOnTop([x, ESP], [x, RETORNO - 8], 4, P)).join("");
  camadas.push(k.groupSvg(ordenar([
    caixa({ x: PLANTA.w - ESP, y: 0, w: ESP, d: ESP, r: 0 }, 0, PE, escuro),
    caixa({ x: PLANTA.w - ESP, y: ESP, w: ESP + 2, d: RETORNO - ESP, r: 0 }, 0, 4, { ...escuro, inner: k.lineSvg(trilhos, { tone: "lo" }) }), // soleira com trilho
    caixa({ x: PLANTA.w - ESP, y: ESP, w: ESP, d: RETORNO - ESP, r: 0 }, VAO, PE - VAO, escuro),
    { prof: prof([VIDRO.x, 175, VAO / 2]), svg: k.solidSvg(k.slabOf(VIDRO, 4, VAO - 4, P), { tone: "mid", className: "mat-vidro", inner: k.lineSvg(reflexos, { className: "reflexo" }) }) },
    ...[95, 175, 255].map((y) => caixa({ x: VIDRO.x, y: y - 2, w: VIDRO.w + 4, d: 4, r: 0 }, 4, VAO - 4, escuro)), // montantes com profundidade
    caixa({ x: PLANTA.w - ESP, y: RETORNO - 8, w: ESP, d: 8, r: 0 }, 0, PE, escuro),
    { ...caixa({ x: PLANTA.w - 2, y: 170, w: 2, d: 3, r: 0 }, 95, 30, escuro), prof: Infinity }, // puxador no montante da porta, por fora do vidro
  ]), { class: "vidro" }));

  // 7 · cobertura neutra; a linha da testeira em volta do beiral é tinta (o acento fica para o CTA). Clarabóia em cinza quente.
  const topo = COB_Z + COBERTURA;
  camadas.push(k.groupSvg([
    k.solidSvg(k.slabOf(PLANO_COB, COB_Z, COBERTURA, P), {
      tone: "mid", className: "mat-cobertura",
      // espessura de 20 cm desenhada: costura da testeira, pingadeira junto à aresta de baixo, hachura na testeira lateral
      // (face de sombra) e juntas da manta a cada metro, de borda a borda do rufo interno.
      inner: k.lineSvg(hachuraFace(faceX(PLANO_COB.x + PLANO_COB.w), [[PLANO_COB.y, COB_Z], [PLANO_COB.y + PLANO_COB.d, COB_Z], [PLANO_COB.y + PLANO_COB.d, topo], [PLANO_COB.y, topo]]), { className: "hachura hachura--leve" })
        + k.lineSvg(k.sideSeam(PLANO_COB, COB_Z + 12, P, 2), { tone: "hi" })
        + k.lineSvg(k.sideSeam(PLANO_COB, COB_Z + 4, P, 2), { tone: "mid" })
        + k.lineSvg(k.planOutline(k.insetPlan(PLANO_COB, 12), topo, P, 2), { tone: "mid" })
        + k.lineSvg(Array.from({ length: 10 }, (_, i) => PLANO_COB.x + 100 * (i + 1))
          .map((x) => k.lineOnTop([x, PLANO_COB.y + 12], [x, PLANO_COB.y + PLANO_COB.d - 12], topo, P)).join(""), { tone: "faint" }),
    }),
    k.solidSvg(k.slabOf(CLARABOIA, topo, 10, P), { tone: "mid" }),
    k.solidSvg(k.slabOf(k.insetPlan(CLARABOIA, 10), topo + 10, 2, P), { tone: "lo", className: "mat-vidro" }),
  ], { class: "estrutura", "data-parte": "cobertura" }));

  // 7b · silhueta da casa a 2 px: as duas arestas verticais extremas das paredes (laje e placa engrossam por CSS).
  // Antes da mureta, que passa na frente da aresta esquerda.
  camadas.push(k.groupSvg(k.lineSvg(k.segment([0, PLANTA.d, PISO_Z], [0, PLANTA.d, COB_Z], P)
    + k.segment([PLANTA.w, 0, 0], [PLANTA.w, 0, COB_Z], P), { className: "silhueta" }), { class: "estrutura", "data-parte": "cobertura" }));

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
    svg: k.solidSvg(k.slabOf(m, PISO_Z, MURETA_H - PISO_Z, P), {
      tone: "lo", className: "mat-plaqueta",
      inner: Array.from({ length: MURETA_H / FIADA }, (_, i) => tons(faceY(m.y + m.d), 100 + i,
        pecas(m.x, m.x + m.w, juntas(m.x + m.w, m.x, i % 2 ? PECA / 2 : 0)).map(([a, b]) => [a, b, Math.round(a)]), i * FIADA, (i + 1) * FIADA)).join("")
        + k.lineSvg(fiadasMureta(m), { tone: "faint" }),
    }),
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
