import { linkWhatsapp, MENSAGEM_PADRAO } from "./lib/whatsapp.mjs";
import { filtrarGaleria } from "./lib/galeria.mjs";
import { gradePlaquetas, cronograma, deveRodarAbertura } from "./lib/abertura.mjs";
import { LOGO_PATHS } from "./figures/out/figures.js";

const WHATSAPP = document.body.dataset.whatsapp;
const DIMENSOES = ["ambiente", "tom"];

function aplicarCtas() {
  const href = linkWhatsapp(WHATSAPP, MENSAGEM_PADRAO);
  const externo = href.startsWith("https");
  for (const a of document.querySelectorAll("a[data-cta]")) {
    a.setAttribute("href", href);
    if (externo) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  }
}

function ligarFiltros() {
  const figuras = [...document.querySelectorAll("#galeria figure")];
  const itens = figuras.map(({ dataset }) => ({ ambiente: dataset.ambiente, tom: dataset.tom }));
  const filtro = { ambiente: null, tom: null };
  const botoes = DIMENSOES.flatMap((chave) =>
    [...document.querySelectorAll(`#galeria-filtros [data-filtro-${chave}]`)].map((botao) => ({
      botao, chave, valor: botao.getAttribute(`data-filtro-${chave}`),
    })));

  const atualizar = () => {
    filtrarGaleria(itens, filtro).forEach((visivel, i) => { figuras[i].hidden = !visivel; });
    for (const { botao, chave, valor } of botoes) {
      botao.setAttribute("aria-pressed", String((filtro[chave] ?? "todos") === valor));
    }
  };

  for (const { botao, chave, valor } of botoes) {
    botao.addEventListener("click", () => {
      filtro[chave] = valor === "todos" || filtro[chave] === valor ? null : valor;
      atualizar();
    });
  }
}

function ligarCabecalhoCompacto() {
  const topo = document.querySelector("header.topo");
  const sentinela = document.createElement("div");
  sentinela.setAttribute("aria-hidden", "true");
  sentinela.style.height = "1px";
  document.querySelector("main").prepend(sentinela);
  new IntersectionObserver(([entrada]) => {
    topo.classList.toggle("is-compact", !entrada.isIntersecting);
  }).observe(sentinela);
}

const SVG_TRANSFORM = "translate(300 32) scale(0.865) translate(10 10)";
const FIM_ABERTURA_MS = 4600;
const LIMITE_ABERTURA_MS = 8000;
const CORTINA_MS = 600;

// Avisa o resto da página que a abertura acabou (ou nem rodou). Microtask: quem
// registrar o ouvinte de forma síncrona neste módulo ainda recebe o evento.
function avisarFimAbertura() {
  queueMicrotask(() => document.dispatchEvent(new CustomEvent("alencar:abertura-fim")));
}

function iniciarAbertura() {
  const no = document.getElementById("abertura");
  if (!no) return avisarFimAbertura();

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let storage = null;
  try { storage = window.localStorage; } catch { /* modo privado: segue sem storage */ }
  if (!deveRodarAbertura({ search: location.search, storage, reduceMotion })) {
    no.remove();
    return avisarFimAbertura();
  }

  const pecas = gradePlaquetas({ cols: 24, rows: 32, larg: 48, alt: 14, gap: 3, x0: 280, y0: 470 });
  const tempos = cronograma(pecas, { porFileiraMs: 70, jitterMs: 120, seed: 7 });
  no.innerHTML = `
    <svg viewBox="0 0 960 540" aria-hidden="true">
      <defs><clipPath id="logoClip" clipPathUnits="userSpaceOnUse" transform="${SVG_TRANSFORM}">${LOGO_PATHS}</clipPath></defs>
      <g clip-path="url(#logoClip)">${pecas.map((p) =>
        `<rect class="bk" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.tom}"/>`).join("")}</g>
      <g transform="${SVG_TRANSFORM}">${LOGO_PATHS.replaceAll("<path", '<path class="outline"')}</g>
    </svg>
    <p class="abertura__contador" aria-hidden="true"><b id="pct">0</b>assentando</p>
    <ul class="abertura__rotulos" aria-hidden="true"><li>Barro próprio</li><li>Queima própria</li><li>Tocantinópolis · TO</li></ul>
    <div class="abertura__assinatura"><img src="assets/logo/alencar-horizontal-terracota-transparente.svg" alt="Cerâmica Alencar"></div>`;
  document.documentElement.classList.add("abrindo");

  const bricks = no.querySelectorAll(".bk");
  const contador = no.querySelector("#pct");
  const timers = [];
  let encerrada = false;
  let tempoCumprido = false;
  let recursosProntos = false;
  const agendar = (fn, ms) => timers.push(setTimeout(fn, ms));

  function encerrar() {
    if (encerrada) return;
    encerrada = true;
    timers.forEach(clearTimeout);
    document.removeEventListener("keydown", aoTeclar);
    no.removeEventListener("click", encerrar);
    try { localStorage.setItem("alencar:abertura", "1"); } catch { /* modo privado */ }
    no.style.transition = `transform ${CORTINA_MS}ms cubic-bezier(.7,0,.2,1)`;
    no.style.transform = "translateY(-100%)";
    document.documentElement.classList.remove("abrindo");
    avisarFimAbertura();
    setTimeout(() => no.remove(), CORTINA_MS);
  }
  const aoTeclar = (e) => { if (e.key === "Enter" || e.key === "Escape") encerrar(); };
  no.addEventListener("click", encerrar);
  document.addEventListener("keydown", aoTeclar);

  let assentadas = 0;
  bricks.forEach((el, i) => agendar(() => {
    el.classList.add("on");
    contador.textContent = Math.round(++assentadas / bricks.length * 100);
  }, tempos[i]));
  agendar(() => no.querySelectorAll(".outline").forEach((o) => o.classList.add("on")), 2400);
  agendar(() => no.querySelector(".abertura__assinatura").classList.add("on"), 3600);

  const tentarFim = () => { if (tempoCumprido && recursosProntos) encerrar(); };
  agendar(() => { tempoCumprido = true; tentarFim(); }, FIM_ABERTURA_MS);
  agendar(encerrar, LIMITE_ABERTURA_MS);
  const carregada = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((ok) => window.addEventListener("load", ok, { once: true }));
  Promise.all([document.fonts?.ready, carregada]).then(() => { recursosProntos = true; tentarFim(); });
}

iniciarAbertura();
aplicarCtas();
ligarFiltros();
ligarCabecalhoCompacto();
