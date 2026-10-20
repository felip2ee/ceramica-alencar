// Coreografia de scroll (browser): revelações das seções, plaqueta narradora que sai da casa
// e cai direto na carroceria (a Fábrica é a 2ª seção), e o caminhão que desce a rota até Palmas.
// Toda a matemática fica em lib/trajeto.mjs; aqui só DOM e GSAP.
import { pontosTrajeto, rotaDesde } from "./lib/trajeto.mjs";

const SOLTA_PX = 40;
const NS = "http://www.w3.org/2000/svg";
// Plaqueta 7 × 24 deitada sobre os paletes, no ângulo dos paletes do desenho (viewBox do caminhão).
const CARGA_TOPO = "344.2,160.1 374.2,163.3 371.9,172 341.9,168.8";
const CARGA_FRENTE = "341.9,168.8 371.9,172 371.9,175 341.9,171.8";

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
  narrar(gsap, ScrollTrigger, svg, veiculo);
}

// Estado escondido só nasce aqui, com o GSAP confirmado: sem ele, nada fica em opacity 0.
function revelar(gsap, reduceMotion) {
  for (const el of gsap.utils.toArray(".section:not(.hero) > .container > *")) {
    gsap.from(el, {
      opacity: 0, y: reduceMotion ? 0 : 12, duration: reduceMotion ? 0.2 : 0.22, ease: "power1.out",
      // clamp(): o que já está na tela (ou no fim da página) revela mesmo sem chegar a 85%.
      scrollTrigger: { trigger: el, start: "clamp(top 85%)", once: true },
    });
  }
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
    scrollTrigger: { trigger: svg, start: "top 40%", end: "top top", scrub: 0.8, invalidateOnRefresh: true },
  })
    .to(veiculo, { motionPath: { path: pontos, autoRotate: false, curviness: 0, fromCurrent: false }, duration: 1 }, 0)
    .fromTo(rota, { strokeDasharray: () => px(total), strokeDashoffset: () => px(resto) }, { strokeDashoffset: 0, duration: 1 }, 0);
}

function narrar(gsap, ScrollTrigger, svg, veiculo) {
  const no = document.getElementById("plaqueta-narradora");
  const casa = document.querySelector("#casa #plaqueta-solta");
  const fabrica = document.getElementById("fabrica");
  if (!no || !casa || !fabrica) return;

  const carga = document.createElementNS(NS, "g");
  carga.setAttribute("class", "carga-extra");
  carga.setAttribute("opacity", "0");
  carga.innerHTML = `<polygon points="${CARGA_TOPO}" fill="#C9896A"/><polygon points="${CARGA_FRENTE}" fill="#B65E3C"/>`;
  veiculo.append(carga);

  const raiz = document.documentElement;
  // Deslocamento da revelação ainda pendente (y 12→0) no bloco que contém o elemento.
  const desloc = (el) => Number(gsap.getProperty(el.closest(".container > *") ?? el, "y")) || 0;
  let solta = null;
  let tl = null;

  function pintar() {
    const soltou = solta?.isActive ?? false;
    const naCarga = tl?.progress() >= 1;
    no.style.visibility = soltou && !naCarga ? "visible" : "hidden";
    casa.style.visibility = soltou ? "hidden" : "";
    carga.setAttribute("opacity", naCarga ? "1" : "0");
  }

  // Da casa direto à carroceria: começa quando a Fábrica (logo abaixo do hero) sobe a 80% da tela,
  // nunca antes de a peça soltar da casa, e termina onde o caminhão parte (topo do mapa a 40%).
  tl = gsap.timeline({
    onUpdate: pintar,
    scrollTrigger: {
      trigger: fabrica,
      start: () => Math.max(SOLTA_PX, fabrica.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.8),
      endTrigger: svg, end: "top 40%",
      scrub: 0.6, invalidateOnRefresh: true,
      onRefresh: (self) => tl && construir(self),
    },
  });

  // Uma perna só, origem → arco → carga, em coordenadas de tela da peça fixa.
  // Roda a cada refresh (resize, load, fontes) e ao soltar da casa, com medidas novas.
  function construir(st, origemTela) {
    if (!(st.end >= st.start)) return; // trigger ainda sem medidas: o próximo refresh monta
    const vw = raiz.clientWidth;
    const vh = window.innerHeight;
    const w = no.offsetWidth;
    const h = no.offsetHeight;
    const topoMin = parseFloat(getComputedStyle(raiz).getPropertyValue("--header")) + 16;
    const limitar = ({ x, y }) => ({
      x: Math.min(Math.max(x, 8), vw - w - 8),
      y: Math.min(Math.max(y, topoMin), vh - h - 8),
    });

    // Origem: onde a plaqueta da casa está na tela ao soltar (ou estaria, com o scroll em SOLTA_PX).
    const r = casa.getBoundingClientRect();
    const origem = origemTela ?? { x: r.left, y: r.top + window.scrollY - SOLTA_PX };
    origem.x += r.width / 2 - w / 2;
    origem.y += r.height / 2 - h / 2;

    // Destino: centro da carga extra no fim do trecho (fora do transform do caminhão, que ainda está na partida).
    const m = svg.getScreenCTM();
    const bb = carga.getBBox();
    const c = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(m);
    const destino = { x: c.x - w / 2, y: c.y - desloc(svg) + window.scrollY - st.end - h / 2 };

    tl.clear().fromTo(no, { scale: r.width / w }, { // nasce do tamanho da peça da casa e encolhe até o da carga
      motionPath: { path: pontosTrajeto(origem, [], destino).map(limitar), autoRotate: false, fromCurrent: false },
      scale: (bb.width * m.a) / w,
      duration: 1, ease: "power1.inOut",
    });
    // Ida e volta força o render: com a timeline já em 0, só progress(0) não redesenharia a origem nova.
    tl.progress(1, true).progress(st.progress, true);
    pintar();
  }

  // Soltar da casa: a fixa nasce exatamente sobre a plaqueta da casa; voltar ao topo devolve a peça.
  construir(tl.scrollTrigger);
  solta = ScrollTrigger.create({
    start: SOLTA_PX, end: "max",
    onToggle: (self) => {
      // Num salto (âncora, reload no meio) a peça da casa já saiu da tela: usa a origem padrão.
      const r = casa.getBoundingClientRect();
      if (self.isActive && r.top >= 0) construir(tl.scrollTrigger, { x: r.left, y: r.top });
      pintar();
    },
  });
}
