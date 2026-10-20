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
test("casa: hero dentro do orçamento e com os grupos que o live precisa", () => {
  const solidos = (F.CASA.match(/class="iso-solid/g)||[]).length;
  assert.ok(solidos >= 80 && solidos <= 150, `solidos=${solidos}`);
  assert.equal((F.CASA.match(/class="fileira mat-plaqueta"/g)||[]).length, F.CASA_META.fileiras);
  assert.ok(F.CASA_META.fileiras >= 10);
  assert.deepEqual([...F.CASA.matchAll(/data-movel="(\w+)"/g)].map(m=>m[1]).sort(), ["luminaria","mesa","planta","sofa","tapete"]);
  assert.match(F.CASA, /id="plaqueta-solta"/);
  assert.match(F.CASA, /role="img" aria-label="Casa moderna/);
  assert.doesNotMatch(F.CASA, /iso-plate|data-readout/);
  assert.ok(F.CASA.length < 400_000, "SVG abaixo de 400 KB");
});
