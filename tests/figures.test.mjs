import { test } from "node:test"; import assert from "node:assert/strict";
import * as F from "../figures/out/figures.js";
test("amostras: três svgs válidos, cada um com dezenas de peças", () => {
  for (const tom of ["claro","medio","escuro"]) {
    const svg = F.AMOSTRAS[tom];
    assert.match(svg, /^<svg [^>]*viewBox="0 0 480 300"/);
    assert.ok((svg.match(/<rect/g)||[]).length >= 60, tom);
  }
  assert.ok(F.AMOSTRAS.claro.includes("#C9896A") && F.AMOSTRAS.escuro.includes("#8E4529"));
});
test("ISO_CSS_MARCA recolorido e sem card", () => {
  assert.match(F.ISO_CSS_MARCA, /--anatomy-paper:#FAF8F1/);
  assert.doesNotMatch(F.ISO_CSS_MARCA, /iso-card|iso-plate|--anatomy-lift|monospace/);
});
