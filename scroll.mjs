// Coreografia de scroll (browser): revelações das seções, plaqueta narradora que sai da casa,
// para ao lado dos títulos e cai na carroceria, e o caminhão que desce a rota até Palmas.
// Toda a matemática fica em lib/trajeto.mjs; aqui só DOM e GSAP.
import { alvosParadas, pontosTrajeto, janelas, rotaDesde } from "./lib/trajeto.mjs";

const SECOES = ["#materialidade", "#revestimentos", "#aplicacoes"];
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
  const titulos = SECOES.map((s) => document.querySelector(`${s} h2`));
  const proximas = [...SECOES.slice(1), "#fabrica"].map((s) => document.querySelector(s));
  if (!no || !casa || titulos.some((t) => !t) || proximas.some((s) => !s)) return;

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

  tl = gsap.timeline({
    onUpdate: pintar,
    scrollTrigger: {
      trigger: "#materialidade", start: "top 80%",
      endTrigger: svg, end: "top 40%", // o mesmo ponto em que o caminhão parte
      scrub: 0.6, invalidateOnRefresh: true,
      onRefresh: (self) => tl && construir(self),
    },
  });

  // Monta as pernas em px de scroll (duração da timeline = start…end do trigger, 1 px = 1 unidade).
  // Roda a cada refresh (resize, load, fontes), já com start/end novos.
  function construir(st, origemTela) {
    if (!(st.end >= st.start)) return; // trigger ainda sem medidas: o próximo refresh monta
    const vw = raiz.clientWidth;
    const vh = window.innerHeight;
    const w = no.offsetWidth;
    const h = no.offsetHeight;
    const topoMin = parseFloat(getComputedStyle(raiz).getPropertyValue("--header")) + 16;
    const limitar = ({ x, y, rot }) => ({
      x: Math.min(Math.max(x, 8), vw - w - 8),
      y: Math.min(Math.max(y, topoMin), vh - h - 8),
      rot,
    });

    // Origem: onde a plaqueta da casa está na tela ao soltar (ou estaria, com o scroll em SOLTA_PX).
    const r = casa.getBoundingClientRect();
    const origem = origemTela ?? { x: r.left, y: r.top + window.scrollY - SOLTA_PX };
    origem.x += r.width / 2 - w / 2;
    origem.y += r.height / 2 - h / 2;
    const escalaCasa = r.width / w; // nasce do tamanho da peça da casa e cresce na primeira perna

    const caixas = titulos.map((t) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(t);
      const texto = faixa.getBoundingClientRect();
      const caixa = t.getBoundingClientRect();
      return { top: caixa.top + window.scrollY - desloc(t), height: caixa.height, titleRight: texto.right };
    });
    const alvos = alvosParadas(caixas, vw, vh);
    // Para quando o meio do título passa a 42% da tela; sai quando a seção seguinte entra por baixo.
    const folga = vh * 0.1;
    const marcos = caixas.map(({ top, height }, i) => {
      const parada = top + height / 2 - vh * 0.42;
      const entraProxima = proximas[i].getBoundingClientRect().top + window.scrollY - vh;
      return { chega: parada - folga - st.start, sai: Math.max(parada + folga, entraProxima) - st.start };
    });

    // Destino: centro da carga extra no fim do trecho (fora do transform do caminhão, que ainda está na partida).
    const m = svg.getScreenCTM();
    const bb = carga.getBBox();
    const c = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(m);
    const destino = { x: c.x - w / 2, y: c.y - desloc(svg) + window.scrollY - st.end - h / 2 };
    const escala = (bb.width * m.a) / w;

    const total = Math.max(st.end - st.start, 1);
    const pts = pontosTrajeto(origem, alvos, destino).map(limitar);
    tl.clear();
    const pernas = janelas(total, marcos);
    pernas.forEach(({ de, ate }, k) => {
      const trecho = pts.slice(2 * k, 2 * k + 3); // [parada, controle, próxima]; a última perna é reta
      const [a, b] = [trecho[0], trecho.at(-1)];
      const ultima = k === pernas.length - 1;
      tl.fromTo(no, { rotation: a.rot, scale: k === 0 ? escalaCasa : 1 }, {
        motionPath: { path: trecho.map(({ x, y }) => ({ x, y })), autoRotate: false, fromCurrent: false },
        rotation: b.rot, scale: ultima ? escala : 1,
        duration: Math.max(ate - de, 0.001), ease: "none", immediateRender: k === 0,
      }, de);
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
      if (self.isActive) {
        const r = casa.getBoundingClientRect();
        construir(tl.scrollTrigger, { x: r.left, y: r.top });
      }
      pintar();
    },
  });
}
