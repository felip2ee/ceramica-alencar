const TONS = ["#B65E3C", "#C9896A", "#8E4529", "#A85D3A"];

export function gradePlaquetas({ cols, rows, larg, alt, gap, x0, y0 }) {
  const pecas = [];
  for (let row = 0; row < rows; row++) {
    const desloc = row % 2 ? (larg + gap) / 2 : 0;
    for (let col = 0; col < cols; col++) {
      pecas.push({
        x: x0 + col * (larg + gap) + desloc,
        y: y0 - row * (alt + gap),
        w: larg, h: alt, row, col,
        tom: TONS[(row * 3 + col) % TONS.length],
      });
    }
  }
  return pecas;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cronograma(pecas, { porFileiraMs = 115, jitterMs = 140, seed = 1 } = {}) {
  const rand = mulberry32(seed);
  return pecas.map((p) => p.row * porFileiraMs + rand() * jitterMs);
}

export function deveRodarAbertura({ search, storage, reduceMotion }) {
  if (reduceMotion) return false;
  if (new URLSearchParams(search).get("abertura") === "1") return true;
  try {
    return storage.getItem("alencar:abertura") !== "1";
  } catch {
    return true;
  }
}
