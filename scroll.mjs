// Coreografia de scroll (browser): revelações das seções, plaqueta narradora que sai da casa
// e cai direto na carroceria (a Fábrica é a 2ª seção), e o caminhão que desce a rota até Palmas.
// Toda a matemática fica em lib/trajeto.mjs; aqui só DOM e GSAP.
import { pontosTrajeto, noArco, poligonosCarga, rotaDesde } from "./lib/trajeto.mjs";

const SOLTA_PX = 40;
const NS = "http://www.w3.org/2000/svg";
const COR_TOPO = "#C9896A";
const COR_FRENTE = "#8E4529";

export function iniciarScroll({ F, reduceMotion }) {
  const svg = document.querySelector("#caminhao svg");
  const veiculo = svg?.querySelector("#caminhao-veiculo");
  const meta = F?.CAMINHAO_META;
  // Sem movimento: o caminhão já está em Palmas. Não depende do GSAP.
  if (reduceMotion && veiculo && meta) {
    veiculo.setAttribute("transform", `translate(${meta.fim[0] - meta.partida[0]} ${meta.fim[1] - meta.partida[1]})`);
  }

  const { gsap, ScrollTrigger, MotionPathPlugin } = window;
  if (!gsap || !ScrollTrigger || !MotionPathPlugin) {
    console.info("GSAP ausente: coreografia desligada");
    return;
  }
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  // O refresh rola para 0 e mede; com html { scroll-behavior: smooth } essa rolagem vira animação
  // e todo start/end sai deslocado pelo scroll atual. Desliga o smooth só durante o refresh.
  const raiz = document.documentElement;
  ScrollTrigger.addEventListener("refreshInit", () => {
    raiz.style.scrollBehavior = "auto";
    void getComputedStyle(raiz).scrollBehavior; // aplica antes do scrollTo(0) do refresh
  });
  // Em telas de toque o ScrollTrigger ignora um resize que volta a uma largura já vista (ignoreMobileResize);
  // largura diferente da do último refresh sempre recalcula, para a plaqueta não ficar fora da tela.
  let largura = raiz.clientWidth;
  let espera = 0;
  ScrollTrigger.addEventListener("refresh", () => {
    raiz.style.scrollBehavior = "";
    largura = raiz.clientWidth;
  });
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => raiz.clientWidth !== largura && ScrollTrigger.refresh(), 300);
  });

  revelar(gsap, reduceMotion);
  if (reduceMotion || !veiculo || !meta) return;
  dirigir(gsap, svg, veiculo, meta);
  narrar(gsap, ScrollTrigger, svg, veiculo, meta.carroceria);
}

// Estado escondido só nasce aqui, com o GSAP confirmado: sem ele, nada fica em opacity 0.
function revelar(gsap, reduceMotion) {
  // Células da grade entram uma a uma; o resto do container entra em bloco. Ao sair pelo topo o elemento some
  // de novo (toggleActions), para a página respirar na rolagem; com reduce-motion só revela uma vez, sem deslocamento.
  const alvos = gsap.utils.toArray(".section:not(.hero) > .container > :not(.grade), .section:not(.hero) > .container > .grade > *, footer .rodape__grade > *");
  alvos.forEach((el) => {
    if (el.querySelector("#caminhao")) return; // a célula do mapa guia o voo da plaqueta (getScreenCTM): não pode deslocar
    gsap.from(el, {
      opacity: 0, y: reduceMotion ? 0 : 28, duration: reduceMotion ? 0.2 : 0.6, ease: "power2.out",
      // clamp(): o que já está na tela (ou no fim da página) revela mesmo sem chegar a 85%.
      scrollTrigger: reduceMotion
        ? { trigger: el, start: "clamp(top 85%)", once: true }
        : { trigger: el, start: "clamp(top 88%)", end: "bottom 6%", toggleActions: "play reverse play reverse" },
    });
  });
}

// Caminhão: começa onde a plaqueta cai (topo do mapa a 40% da tela) e chega a Palmas com o mapa no topo.
function dirigir(gsap, svg, veiculo, meta) {
  const rota = svg.querySelector("#rota-principal");
  if (!rota) return;
  const pontos = rotaDesde(rota.getAttribute("d"), meta.partida);
  const resto = pontos.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pontos[i].x, p.y - pontos[i].y), 0);
  const total = rota.getTotalLength();
  // Ramais (PA, MA, PI, GO) aparecem um a um enquanto o mapa entra, prontos antes da partida.
  gsap.from(svg.querySelectorAll(".rota"), {
    opacity: 0, stagger: 0.3, ease: "none",
    scrollTrigger: { trigger: svg, start: "top 85%", end: "top 45%", scrub: true },
  });
  // A linha vermelha vai até o caminhão; o trecho à frente se desenha conforme ele anda.
  // A rota usa vector-effect: non-scaling-stroke, então o tracejado é em px de tela: escala pelo CTM.
  const px = (v) => v * svg.getScreenCTM().a;
  gsap.timeline({
    defaults: { ease: "none" },
    // scrub sem atraso: até o ponto da entrega o caminhão está exatamente na partida, onde a plaqueta pousa.
    scrollTrigger: { trigger: svg, start: "top 40%", end: "top top", scrub: true, invalidateOnRefresh: true },
  })
    .to(veiculo, { motionPath: { path: pontos, autoRotate: false, curviness: 0, fromCurrent: false }, duration: 1 }, 0)
    .fromTo(rota, { strokeDasharray: () => px(total), strokeDashoffset: () => px(resto) }, { strokeDashoffset: 0, duration: 1 }, 0);
}

// Plaqueta (topo + frente) como SVG; a mesma peça na carroceria e na plaqueta fixa, para a troca não mudar a forma.
function plaquetaSvg(carroceria) {
  const { topo, frente } = poligonosCarga(carroceria);
  const xs = [...topo, ...frente].map((p) => p[0]);
  const ys = [...topo, ...frente].map((p) => p[1]);
  const caixa = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const pts = (ps) => ps.map((p) => p.join(",")).join(" ");
  const faces = `<polygon points="${pts(topo)}" fill="${COR_TOPO}"/><polygon points="${pts(frente)}" fill="${COR_FRENTE}"/>`;
  return { faces, viewBox: caixa.join(" ") };
}

function narrar(gsap, ScrollTrigger, svg, veiculo, carroceria) {
  const no = document.getElementById("plaqueta-narradora");
  const palco = document.getElementById("casa");
  const casa = palco?.querySelector("#plaqueta-solta");
  if (!no || !casa || !carroceria) return;

  const { faces, viewBox } = plaquetaSvg(carroceria);
  const carga = document.createElementNS(NS, "g");
  carga.setAttribute("class", "carga-extra");
  carga.setAttribute("opacity", "0");
  carga.innerHTML = faces;
  veiculo.append(carga);
  no.innerHTML = `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${faces}</svg>`;

  const raiz = document.documentElement;
  const suave = gsap.parseEase("power2.inOut"); // chega com velocidade ~0: a troca não salta
  let origem = null; // centro da peça da casa na tela com o scroll no ponto de soltar (cache até o próximo refresh)

  // Voo: do ponto de soltar (scroll 40) ao ponto em que o caminhão parte (topo do mapa a 40% da tela).
  // Sem timeline com atraso: a posição sai do scroll atual e da posição viva da carga, quadro a quadro,
  // então no ponto de entrega a plaqueta fixa está exatamente sobre a carga, em qualquer velocidade.
  // Os callbacks recebem o próprio trigger (o create pode chamá-los antes de retornar).
  const st = ScrollTrigger.create({
    start: SOLTA_PX, endTrigger: svg, end: "top 40%",
    onUpdate: atualizar, onToggle: atualizar,
    onRefresh: (self) => { origem = null; atualizar(self); },
  });

  function atualizar(st) {
    const y = st.scroll();
    const naCarga = y >= st.end;
    // Só voa depois que a casa terminou de se montar: antes disso a peça ainda está descendo no lugar.
    const voando = palco.classList.contains("is-ready") && y > st.start && !naCarga;
    no.style.visibility = voando ? "visible" : "hidden";
    casa.style.visibility = voando || naCarga ? "hidden" : "";
    carga.setAttribute("opacity", naCarga ? "1" : "0");
    if (voando) posicionar(st, Math.min(1, (y - st.start) / Math.max(st.end - st.start, 1)));
  }

  function posicionar(st, p) {
    const vw = raiz.clientWidth;
    const vh = window.innerHeight;
    const w = no.offsetWidth;
    const h = no.offsetHeight;
    const topoMin = parseFloat(getComputedStyle(raiz).getPropertyValue("--header")) + 16;
    const dentro = ({ x, y }) => ({
      x: Math.min(Math.max(x, 8 + w / 2), vw - 8 - w / 2),
      y: Math.min(Math.max(y, topoMin + h / 2), vh - 8 - h / 2),
    });
    const r = casa.getBoundingClientRect();
    origem ??= { x: r.left + r.width / 2, y: r.top + r.height / 2 + st.scroll() - st.start, escala: r.width / w };
    // Destino vivo: a carga na tela agora (scroll e revelação incluídos), com o caminhão na partida,
    // que é onde ele está durante todo o voo. Pelo CTM do svg, não pelo retângulo da carga:
    // o trigger do caminhão atualiza depois deste e ainda pode estar com o quadro anterior.
    const m = svg.getScreenCTM();
    const bb = carga.getBBox();
    const destino = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(m);
    const t = suave(p);
    const { x, y } = noArco(pontosTrajeto(dentro(origem), [], dentro(destino), { mobile: vw < 768, viewportW: vw }).map(dentro), t);
    const escala = origem.escala + ((bb.width * m.a) / w - origem.escala) * t;
    no.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px) scale(${escala})`;
  }

  // A casa fica pronta sem scroll: reavalia nesse momento (e só nele).
  if (!palco.classList.contains("is-ready")) {
    const vigia = new MutationObserver(() => {
      if (!palco.classList.contains("is-ready")) return;
      vigia.disconnect();
      origem = null;
      atualizar(st);
    });
    vigia.observe(palco, { attributes: true, attributeFilter: ["class"] });
  }
  atualizar(st);
}
