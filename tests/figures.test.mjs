import { test } from "node:test"; import assert from "node:assert/strict";
import * as F from "../figures/out/figures.js";
import mapa from "../figures/mapa-to.json" with { type: "json" };
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
  // p1 r2: o canteiro com folhagem saiu (só a plaqueta tem cor), por isso o piso desceu de 80 para 70
  assert.ok(solidos >= 70 && solidos <= 150, `solidos=${solidos}`);
  assert.equal((F.CASA.match(/class="fileira mat-plaqueta"/g)||[]).length, F.CASA_META.fileiras);
  assert.ok(F.CASA_META.fileiras >= 10);
  assert.deepEqual([...F.CASA.matchAll(/data-movel="(\w+)"/g)].map(m=>m[1]).sort(), ["luminaria","mesa","planta","sofa","tapete"]);
  assert.match(F.CASA, /id="plaqueta-solta"/);
  assert.match(F.CASA, /role="img" aria-label="Casa moderna/);
  assert.doesNotMatch(F.CASA, /iso-plate|data-readout/);
  assert.ok(F.CASA.length < 400_000, "SVG abaixo de 400 KB");
});
test("mapa do Tocantins simplificado e com as duas cidades", () => {
  assert.ok(mapa.anel.length >= 80 && mapa.anel.length <= 400);
  const lons = mapa.anel.map(p=>p[0]), lats = mapa.anel.map(p=>p[1]);
  assert.ok(Math.min(...lons) > -51 && Math.max(...lons) < -45 && Math.min(...lats) > -14 && Math.max(...lats) < -5);
  assert.deepEqual(mapa.cidades.tocantinopolis, [-47.4224,-6.3245]);
});
test("caminhão: figura com mapa, rota e carroceria", () => {
  assert.match(F.CAMINHAO, /id="mapa"/); assert.match(F.CAMINHAO, /<g id="caminhao-veiculo" class="movel">/); assert.match(F.CAMINHAO, /id="rota-principal"/);
  assert.equal((F.CAMINHAO.match(/class="rota"/g)||[]).length, 4);
  const solidos = (F.CAMINHAO.match(/class="iso-solid/g)||[]).length;
  assert.ok(solidos >= 40 && solidos <= 80, `solidos=${solidos}`);
  assert.ok(F.CAMINHAO_META.inicio[1] < F.CAMINHAO_META.fim[1], "Tocantinópolis fica acima de Palmas na tela");
  assert.deepEqual([...F.CAMINHAO.matchAll(/data-uf="(\w+)"/g)].map(m=>m[1]).sort(), ["GO","MA","PA","PI"]);
  // 12 fardos de plaqueta na carga (a fábrica do mapa também é de plaqueta, por isso só dentro do veículo)
  assert.equal((F.CAMINHAO.split('id="caminhao-veiculo"')[1].match(/mat-plaqueta/g)||[]).length, 12);
  assert.equal(F.CAMINHAO_META.partida.length, 2);
  assert.ok(F.CAMINHAO_META.carroceria.w > 0);
});
