// Animação da casa do hero (browser). Constrói fileira a fileira, mobília, e depois respira com o ponteiro.
// Fases: "construindo" (timers) → "pronta" (loop único: paralaxe com follow + tour ocioso, pausa fora da tela).

const FILEIRA_MS = 28; // 35 fiadas: a última assenta antes das paredes (1,4 s) e a casa fecha em ≈ 3 s
const MOVEL_MS = 65;
const OVERSHOOT = "cubic-bezier(.2,.9,.2,1.2)";
const ASSENTA = "cubic-bezier(.2,.8,.2,1)";
// px do viewBox no extremo do ponteiro: casca inteira junta (piso, paredes, vidro, cobertura), móveis à parte.
const PARALAXE = { estrutura: 2, vidro: 2, fileira: 2, movel: 4 };
const TAU = 0.25;
const OCIOSO_MS = 1400;
const TOUR_PERIODO = 9;
const TOUR_AMPLITUDE = 0.75; // × 4 px dos móveis = 3 px

export function animarCasa(svgRoot, { reduceMotion }) {
  const palco = svgRoot.parentElement;
  const todos = (sel) => [...svgRoot.querySelectorAll(sel)];
  const parte = (nome) => todos(`.estrutura[data-parte="${nome}"]`);
  const fileiras = todos(".fileira").sort((a, b) => a.dataset.fileira - b.dataset.fileira);
  const solta = svgRoot.querySelector("#plaqueta-solta");
  const moveis = ["tapete", "sofa", "mesa", "luminaria", "planta"]
    .map((nome) => svgRoot.querySelector(`[data-movel="${nome}"]`)).filter(Boolean);

  if (reduceMotion) {
    palco.classList.add("is-ready");
    return { pronto: Promise.resolve(), parar() {} };
  }

  const timers = [];
  let frame = 0;
  let parado = false;
  const desligar = [];

  // Revelação: cada passo é [elementos, início ms, deslocamento inicial em y, transições].
  const passos = [
    [parte("piso"), 0, 0, "opacity 500ms ease"],
    ...fileiras.map((el, n) => [[el], 300 + n * FILEIRA_MS, -8, `opacity 350ms ease, transform 450ms ${ASSENTA}`]),
    [[solta], 300 + fileiras.length * FILEIRA_MS + 100, -24, `opacity 200ms ease, transform 600ms ${OVERSHOOT}`],
    [[...parte("paredes"), ...parte("cinta"), ...parte("cobertura")], 1400, -14, `opacity 500ms ease, transform 700ms ${ASSENTA}`],
    [todos(".vidro"), 1750, 0, "opacity 600ms ease"],
    ...moveis.map((el, i) => [[el], 2150 + i * MOVEL_MS, -18, `opacity 250ms ease, transform 650ms ${OVERSHOOT}`]),
    [parte("jardim"), 2400, 6, `opacity 500ms ease, transform 600ms ${ASSENTA}`],
  ];
  const FIM_MS = 2150 + (moveis.length - 1) * MOVEL_MS + 650 + 200; // ≈ 3 s

  for (const [els, , dy] of passos) for (const el of els) if (el) el.style.transform = `translate(0px, ${dy}px)`;
  svgRoot.getBoundingClientRect(); // fixa o estado inicial antes das transições

  for (const [els, t, , transicao] of passos) {
    timers.push(setTimeout(() => {
      for (const el of els) {
        if (!el) continue;
        el.style.transition = transicao;
        el.style.opacity = "1";
        el.style.transform = "translate(0px, 0px)";
      }
    }, t));
  }

  let concluir;
  const pronto = new Promise((ok) => { concluir = ok; });
  timers.push(setTimeout(() => {
    palco.classList.add("is-ready");
    for (const [els] of passos) for (const el of els) if (el) el.style.transition = "none";
    concluir();
    iniciarVida();
  }, FIM_MS));

  // Fase "pronta": um loop, alvo do ponteiro com follow τ 0,25 s, tour ocioso depois de 1,4 s parado.
  const grupos = Object.entries(PARALAXE).flatMap(([classe, px]) => todos(`.${classe}`).map((el) => [el, px]));
  const alvo = { x: 0, y: 0 };
  const pos = { x: 0, y: 0 };
  let ultimoToque = -Infinity;
  let relogio = 0;
  let visivel = false;
  let last = 0;
  let viva = false;

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (now - ultimoToque > OCIOSO_MS) {
      relogio += dt;
      const fase = (2 * Math.PI * relogio) / TOUR_PERIODO;
      alvo.x = TOUR_AMPLITUDE * Math.sin(fase);
      alvo.y = TOUR_AMPLITUDE * 0.5 * Math.sin(2 * fase);
    }
    const k = 1 - Math.exp(-dt / TAU);
    pos.x += (alvo.x - pos.x) * k;
    pos.y += (alvo.y - pos.y) * k;
    for (const [el, px] of grupos) el.style.transform = `translate(${(pos.x * px).toFixed(2)}px, ${(pos.y * px).toFixed(2)}px)`;
    frame = visivel && !parado ? requestAnimationFrame(tick) : 0;
  }
  const rodar = () => { if (viva && !parado && visivel && !frame) { last = 0; frame = requestAnimationFrame(tick); } };

  const observador = new IntersectionObserver((entradas) => {
    visivel = entradas[entradas.length - 1].isIntersecting;
    rodar();
  }, { rootMargin: "120px 0px" });
  observador.observe(svgRoot);
  desligar.push(() => observador.disconnect());

  function iniciarVida() {
    if (parado) return;
    viva = true;
    const area = palco.closest("section") ?? palco;
    const mover = (e) => {
      const caixa = svgRoot.getBoundingClientRect();
      const lim = (v) => Math.max(-1, Math.min(1, v));
      alvo.x = lim((e.clientX - caixa.left - caixa.width / 2) / (caixa.width / 2));
      alvo.y = lim((e.clientY - caixa.top - caixa.height / 2) / (caixa.height / 2));
      ultimoToque = performance.now();
    };
    area.addEventListener("pointermove", mover, { passive: true });
    desligar.push(() => area.removeEventListener("pointermove", mover));
    rodar();
  }

  return {
    pronto,
    parar() {
      parado = true;
      timers.forEach(clearTimeout);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      desligar.forEach((fn) => fn());
      palco.classList.add("is-ready");
      for (const el of todos(".estrutura,.fileira,.movel,.vidro,#plaqueta-solta")) {
        el.style.transition = "none";
        el.style.transform = "";
        el.style.opacity = "";
      }
      concluir();
    },
  };
}
