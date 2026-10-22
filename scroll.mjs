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
  // No celular a barra de endereço muda a altura da janela a cada rolada; sem isto o ScrollTrigger refaz todas as
  // medidas no meio da rolagem e os pins pulam (espaço em branco, seção aparecendo duas vezes).
  ScrollTrigger.config({ ignoreMobileResize: true });
  // No toque, o navegador avança dezenas de px entre dois eventos de scroll numa flicada: o pin só prende no evento
  // seguinte e a seção estala de volta ao topo (e de novo ao soltar, no fim). normalizeScroll leva a rolagem para o
  // thread do JS, o ScrollTrigger atualiza a cada quadro e o pin prende e solta no px certo. Só no toque; o mouse não precisa.
  // ?semnormalize: diagnóstico no aparelho, rolagem nativa para comparar o pin com e sem o normalize.
  const normalizado = ScrollTrigger.isTouch === 1 && !location.search.includes("semnormalize"); if (normalizado) ScrollTrigger.normalizeScroll({ allowNestedScroll: true });
  // O refresh rola para 0 e mede; com html { scroll-behavior: smooth } essa rolagem vira animação
  // e todo start/end sai deslocado pelo scroll atual. Desliga o smooth só durante o refresh.
  // Com normalizeScroll o smooth fica desligado de vez: ele rola por window.scrollTo a cada quadro, e com smooth
  // cada chamada vira uma animação que o quadro seguinte interrompe (um arrasto de 400 px movia 59; a página não descia).
  const raiz = document.documentElement;
  const smoothDeVolta = () => { raiz.style.scrollBehavior = normalizado ? "auto" : ""; };
  smoothDeVolta();
  ScrollTrigger.addEventListener("refreshInit", () => {
    raiz.style.scrollBehavior = "auto";
    void getComputedStyle(raiz).scrollBehavior; // aplica antes do scrollTo(0) do refresh
  });
  // Em telas de toque o ScrollTrigger ignora um resize que volta a uma largura já vista (ignoreMobileResize);
  // largura diferente da do último refresh sempre recalcula, para a plaqueta não ficar fora da tela.
  let largura = raiz.clientWidth;
  let espera = 0;
  ScrollTrigger.addEventListener("refresh", () => {
    smoothDeVolta();
    largura = raiz.clientWidth;
  });
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => raiz.clientWidth !== largura && ScrollTrigger.refresh(), 300);
  });

  revelar(gsap, reduceMotion);
  if (reduceMotion) return;
  // O pin da Fábrica empurra tudo que vem depois em uma tela: ele nasce primeiro e um refresh no fim
  // remede todos os gatilhos já com o espaçador do pin no lugar.
  if (veiculo && meta) {
    dirigir(gsap, svg, veiculo, meta);
    narrar(gsap, ScrollTrigger, svg, veiculo, meta.carroceria);
  }
  titulos(gsap);
  interludios(gsap);
  // Vários pins (interlúdios e Fábrica): o refresh mede na ordem da página, para cada gatilho ver os espaçadores
  // dos pins que vêm antes dele.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  if (location.search.includes("debug")) diagnostico(gsap, ScrollTrigger);
}

// Diagnóstico no aparelho (?debug): painel fixo com scroll real x scroll do ScrollTrigger, altura da janela, contagem de
// refresh/resize, o pin ativo e os últimos eventos. Temporário: sai quando o pin do celular estiver resolvido.
function diagnostico(gsap, ScrollTrigger) {
  const el = document.createElement("pre");
  el.style.cssText = "position:fixed;left:0;bottom:0;z-index:999;margin:0;padding:6px 8px;font:11px/1.35 monospace;background:#000c;color:#9f9;pointer-events:none;white-space:pre;max-width:100vw";
  document.body.append(el);
  let refresh = 0, resize = 0, estado = "", t0 = performance.now();
  const eventos = [];
  ScrollTrigger.addEventListener("refresh", () => refresh++);
  window.addEventListener("resize", () => resize++);
  const anota = (texto) => { eventos.unshift(`${((performance.now() - t0) / 1000).toFixed(1)}s ${texto}`); eventos.length = Math.min(eventos.length, 6); };
  let ultimoRefresh = 0;
  gsap.ticker.add(() => {
    const st = ScrollTrigger.getAll()[0];
    const pin = ScrollTrigger.getAll().find((t) => t.pin && t.isActive);
    const y = Math.round(scrollY), sy = Math.round(st.scroll());
    const agora = pin ? `pin ${pin.trigger.id || pin.trigger.className.split(" ")[0]}` : "sem pin";
    if (agora !== estado) { anota(`${agora} y${y} st${sy}`); estado = agora; }
    if (refresh !== ultimoRefresh) { anota(`refresh #${refresh} y${y} ih${innerHeight}`); ultimoRefresh = refresh; }
    el.textContent = `y ${y}  st ${sy}  ih ${innerHeight}  iw ${innerWidth}  refresh ${refresh}  resize ${resize}\n`
      + (pin ? `${agora} p ${pin.progress.toFixed(2)} start ${Math.round(pin.start)} end ${Math.round(pin.end)} top ${Math.round(pin.pin.getBoundingClientRect().top)} ${pin.pin.style.position}` : agora)
      + "\n" + eventos.join("\n");
  });
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
        : { trigger: el, start: "clamp(top 88%)", end: "bottom 6%", toggleActions: "play reverse play reverse", pinnedContainer: el.closest("#fabrica") || undefined },
    });
  });
}

const ALTURA_CABECALHO = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header")) || 64;

// Caminhão: a plaqueta cai com o mapa a 40% da tela; depois a seção da Fábrica fica presa (pin) por uma tela
// inteira de rolagem com só o mapa à vista (a moldura tem a altura da tela), e é nesse trecho que o caminhão desce
// a rota até Palmas, no desktop e no celular. Título e texto da seção só aparecem depois, com a rolagem normal.
function dirigir(gsap, svg, veiculo, meta) {
  const { ScrollTrigger } = window;
  const secao = document.getElementById("fabrica");
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
    scrollTrigger: {
      // fim pela altura da moldura (svh, estável), não pela da janela, que muda com a barra de endereço
      trigger: secao, start: () => `top ${ALTURA_CABECALHO()}px`, end: () => `+=${secao.querySelector(".fabrica__moldura").offsetHeight}`, scrub: true,
      pin: true, pinSpacing: true, anticipatePin: ScrollTrigger.isTouch === 1 ? 0 : 1, invalidateOnRefresh: true, refreshPriority: 1,
    },
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
  // No celular a plaqueta não voa (pedido do dono em 2026-10-21): a peça fica na casa e a carga não entra no caminhão.
  if (!no || !casa || !carroceria || document.documentElement.clientWidth < 768) return;

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

// Títulos revelados pelo scroll, palavra a palavra: cada palavra sobe e ganha tinta conforme o título entra na tela.
// Mantém <em> e <br>: só os nós de texto viram spans. No título da Fábrica o progresso é o da seção presa.
function dividirPalavras(el) {
  const spans = [];
  const andar = (no) => {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const parte of filho.textContent.split(/(\s+)/)) {
          if (!parte) continue;
          if (/^\s+$/.test(parte)) { frag.append(parte); continue; }
          const span = document.createElement("span");
          span.className = "palavra";
          span.textContent = parte;
          frag.append(span);
          spans.push(span);
        }
        filho.replaceWith(frag);
      } else if (filho.nodeType === Node.ELEMENT_NODE && filho.tagName !== "BR") {
        andar(filho);
      }
    }
  };
  andar(el);
  return spans;
}

function titulos(gsap) {
  for (const el of gsap.utils.toArray(".section:not(.hero) h2:not(.so-leitor), .par__texto h3")) {
    const palavras = dividirPalavras(el);
    if (!palavras.length) continue;
    gsap.from(palavras, {
      opacity: 0.08, y: "0.45em", ease: "none", stagger: 0.25,
      // o título da Fábrica fica abaixo da moldura de tela cheia: entra depois do pin, como os outros
      scrollTrigger: { trigger: el, start: "top 92%", end: "top 48%", scrub: 0.3, pinnedContainer: el.closest("#fabrica") || undefined },
    });
  }
}

// Interlúdios: a seção fica presa por uma tela e meia de rolagem com a foto andando devagar (paralaxe); a primeira
// frase fica, sobe e some, a segunda sobe no lugar e fica até a página seguir.
function interludios(gsap) {
  const { ScrollTrigger } = window;
  for (const sec of gsap.utils.toArray(".interludio")) {
    const foto = sec.querySelector(".interludio__foto");
    const texto = sec.querySelector(".interludio__texto");
    const [primeira, segunda] = sec.querySelectorAll(".interludio__frase");
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: sec, start: () => `top ${ALTURA_CABECALHO()}px`, end: () => `+=${sec.offsetHeight * 1.5}`, scrub: 0.3,
        pin: true, pinSpacing: true, anticipatePin: ScrollTrigger.isTouch === 1 ? 0 : 1, invalidateOnRefresh: true, refreshPriority: 1,
      },
    });
    if (foto) tl.fromTo(foto, { yPercent: -6 }, { yPercent: 6, duration: 10 }, 0);
    // A frase não congela no pin: segue subindo devagar com a rolagem, para o travar e o soltar não serem secos
    // (pedido do dono em 2026-10-21). yPercent -50 repete o translateY(-50%) do CSS, que o GSAP substituiria.
    if (texto) tl.fromTo(texto, { yPercent: -50, y: 36 }, { yPercent: -50, y: -36, duration: 10 }, 0);
    if (primeira && segunda) {
      tl.to(primeira, { opacity: 0, y: -40, duration: 1.5 }, 4)
        .fromTo(segunda, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.5 }, 4.8);
    }
  }
}
