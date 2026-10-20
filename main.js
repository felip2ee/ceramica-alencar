import { linkWhatsapp, MENSAGEM_PADRAO } from "./lib/whatsapp.mjs";
import { filtrarGaleria } from "./lib/galeria.mjs";

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

aplicarCtas();
ligarFiltros();
ligarCabecalhoCompacto();
