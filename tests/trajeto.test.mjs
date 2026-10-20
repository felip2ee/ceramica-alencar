// site/tests/trajeto.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { pontosTrajeto, alvosParadas } from "../lib/trajeto.mjs";
test("alvos: um por seção, dentro da viewport", () => {
  const alvos = alvosParadas([{top:800,height:600,titleRight:700},{top:1500,height:700,titleRight:1300}], 1440, 900);
  assert.equal(alvos.length, 2);
  assert.deepEqual(alvos[0], {x:748, y:378, rot:-6});
  assert.equal(alvos[1].x, 1300, "clampa em viewportW-140");
});
test("trajeto: origem, paradas com controle, destino; rotações alternam", () => {
  const pts = pontosTrajeto({x:0,y:0}, [{x:100,y:300,rot:-6},{x:120,y:900,rot:4}], {x:400,y:1500});
  assert.deepEqual(pts[0], {x:0,y:0,rot:0});
  assert.deepEqual(pts.at(-1), {x:400,y:1500,rot:0});
  assert.equal(pts.length, 1 + 2*2 + 1);
  assert.equal(pts[1].x, 160, "controle 60px para fora antes da parada");
});

import { janelas, rotaDesde } from "../lib/trajeto.mjs";
test("alvos no celular: canto inferior direito", () => {
  assert.deepEqual(alvosParadas([{top:0,height:1,titleRight:300}], 390, 844), [{x:320, y:724, rot:-6}]);
});
test("janelas: trechos monotônicos e presos em [0,total]", () => {
  assert.deepEqual(janelas(1000, [{chega:200, sai:300}, {chega:250, sai:1200}]),
    [{de:0, ate:200}, {de:300, ate:300}, {de:1000, ate:1000}]);
});
test("rota: pontos a partir da partida, relativos a ela", () => {
  assert.deepEqual(rotaDesde("M414.9 107.6L350.6 227.9L342.8 281.8L307.5 387.7", [350.6, 227.9]),
    [{x:0, y:0}, {x:-7.8, y:53.9}, {x:-43.1, y:159.8}]);
});
