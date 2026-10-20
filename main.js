import { linkWhatsapp, MENSAGEM_PADRAO } from "./lib/whatsapp.mjs";
import { filtrarGaleria } from "./lib/galeria.mjs";
import { gradePlaquetas, cronograma, deveRodarAbertura } from "./lib/abertura.mjs";
import { animarCasa } from "./figures/casa-live.mjs";
import { iniciarScroll } from "./scroll.mjs";

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
// Caixa do símbolo no viewBox da abertura (limites reais ≈ x 315–759, y 48–442) e viewBox com ~12 de margem.
const CAIXA = { x0: 315.6, x1: 759.4, y0: 48.4, y1: 442.2 };
const VIEWBOX_ABERTURA = "297 35 481 420";
const FIM_ABERTURA_MS = 4600;
const LIMITE_ABERTURA_MS = 8000;
const CORTINA_MS = 600;

// Avisa o resto da página que a abertura acabou (ou nem rodou). Microtask: quem
// registrar o ouvinte de forma síncrona neste módulo ainda recebe o evento.
// Módulos tardios podem checar document.documentElement.dataset.abertura === "fim".
function avisarFimAbertura() {
  queueMicrotask(() => {
    document.documentElement.dataset.abertura = "fim";
    document.dispatchEvent(new CustomEvent("alencar:abertura-fim"));
  });
}

// Um único import, compartilhado pela abertura e pela injeção. Dinâmico de propósito: se falhar, a página segue sem figuras.
const figuras = import("./figures/out/figures.js");

function injetarFiguras(F) {
  const estilo = document.createElement("style");
  estilo.id = "iso-css";
  estilo.textContent = F.ISO_CSS_MARCA;
  document.head.append(estilo);
  for (const no of document.querySelectorAll(".amostra[data-tom]")) {
    no.innerHTML = F.AMOSTRAS[no.dataset.tom] ?? "";
  }
  const casa = document.getElementById("casa");
  if (casa && F.CASA) {
    casa.innerHTML = F.CASA;
    iniciarCasa(casa);
  }
  const caminhao = document.getElementById("caminhao");
  if (caminhao && F.CAMINHAO) caminhao.innerHTML = F.CAMINHAO;
  depoisDaAbertura(() => {
    try { iniciarScroll({ F, reduceMotion: querMenosMovimento() }); } catch (erro) { console.warn("scroll sem coreografia", erro); }
  });
}

const querMenosMovimento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function depoisDaAbertura(fn) {
  if (document.documentElement.dataset.abertura === "fim") fn();
  else document.addEventListener("alencar:abertura-fim", fn, { once: true });
}

// A casa só se constrói depois da abertura (ou já, se ela não rodou ou acabou antes do import).
function iniciarCasa(casa) {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const comecar = () => {
    try { animarCasa(casa.querySelector("svg"), { reduceMotion }); } catch (erro) {
      console.warn("casa sem animação", erro);
      casa.classList.add("is-ready");
    }
  };
  depoisDaAbertura(comecar);
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

  const fundo = document.querySelectorAll("header, main");
  const timers = [];
  let encerrada = false;
  const agendar = (fn, ms) => timers.push(setTimeout(fn, ms));
  const liberarPagina = () => {
    timers.forEach(clearTimeout);
    document.documentElement.classList.remove("abrindo");
    fundo.forEach((el) => el.removeAttribute("inert"));
  };

  function encerrar() {
    if (encerrada) return;
    encerrada = true;
    liberarPagina();
    try { localStorage.setItem("alencar:abertura", "1"); } catch { /* modo privado */ }
    no.style.transition = `transform ${CORTINA_MS}ms cubic-bezier(.7,0,.2,1)`;
    no.style.transform = "translateY(-100%)";
    avisarFimAbertura();
    setTimeout(() => no.remove(), CORTINA_MS);
  }

  // Falha ao montar (figures.js fora do ar, erro de DOM): some sem cortina e a página segue.
  function abortar(erro) {
    console.warn("abertura abortada", erro);
    if (encerrada) return;
    encerrada = true;
    liberarPagina();
    no.remove();
    avisarFimAbertura();
  }

  let montada = false;
  document.documentElement.classList.add("abrindo");
  fundo.forEach((el) => el.setAttribute("inert", ""));
  no.focus({ preventScroll: true });

  // Teto armado já, antes do import: se o import travar, ainda assim a página é liberada.
  agendar(() => (montada ? encerrar() : abortar("limite de tempo antes de montar")), LIMITE_ABERTURA_MS);

  figuras.then(({ LOGO_PATHS }) => {
    if (encerrada) return;
    montada = true;
    const pecas = gradePlaquetas({ cols: 11, rows: 25, larg: 48, alt: 14, gap: 3, x0: 280, y0: 440 });
    const tempos = cronograma(pecas, { porFileiraMs: 70, jitterMs: 120, seed: 7 });
    const visivel = pecas.map((p) =>
      p.x < CAIXA.x1 && p.x + p.w > CAIXA.x0 && p.y < CAIXA.y1 && p.y + p.h > CAIXA.y0);
    const total = visivel.filter(Boolean).length;
    no.innerHTML = `
      <svg viewBox="${VIEWBOX_ABERTURA}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><clipPath id="logoClip" clipPathUnits="userSpaceOnUse" transform="${SVG_TRANSFORM}">${LOGO_PATHS}</clipPath></defs>
        <g clip-path="url(#logoClip)">${pecas.map((p) =>
          `<rect class="bk" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.tom}"/>`).join("")}</g>
        <g transform="${SVG_TRANSFORM}">${LOGO_PATHS.replaceAll("<path", '<path class="outline"')}</g>
      </svg>
      <p class="abertura__contador" aria-hidden="true"><b id="pct">0</b>assentando</p>
      <ul class="abertura__rotulos" aria-hidden="true"><li>Barro próprio</li><li>Queima própria</li><li>Tocantinópolis · TO</li></ul>
      <div class="abertura__assinatura"><img src="assets/logo/alencar-horizontal-terracota-transparente.svg" alt="Cerâmica Alencar"></div>
      <button class="abertura__pular" type="button">Pular</button>`;

    const bricks = no.querySelectorAll(".bk");
    const contador = no.querySelector("#pct");
    let assentadas = 0;
    bricks.forEach((el, i) => agendar(() => {
      el.classList.add("on");
      if (visivel[i]) contador.textContent = Math.round(++assentadas / total * 100);
    }, tempos[i]));
    agendar(() => no.querySelectorAll(".outline").forEach((o) => o.classList.add("on")), 2400);
    agendar(() => no.querySelector(".abertura__assinatura").classList.add("on"), 3600);

    let tempoCumprido = false;
    let recursosProntos = false;
    const tentarFim = () => { if (tempoCumprido && recursosProntos) encerrar(); };
    agendar(() => { tempoCumprido = true; tentarFim(); }, FIM_ABERTURA_MS);
    const carregada = document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((ok) => window.addEventListener("load", ok, { once: true }));
    Promise.all([document.fonts?.ready, carregada]).then(() => { recursosProntos = true; tentarFim(); });
  }).catch(abortar);

  // Teclas no próprio diálogo (focado): um link atrás não navega e pula ao mesmo tempo.
  no.addEventListener("click", encerrar);
  no.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "Escape") encerrar(); });
}

try { iniciarAbertura(); } catch (erro) {
  console.warn("abertura falhou", erro);
  document.getElementById("abertura")?.remove();
  document.documentElement.classList.remove("abrindo");
  document.querySelectorAll("header, main").forEach((el) => el.removeAttribute("inert"));
  avisarFimAbertura();
}
figuras.then(injetarFiguras).catch((erro) => console.warn("figuras indisponíveis", erro));
aplicarCtas();
ligarFiltros();
ligarCabecalhoCompacto();
