// site/tests/trajeto.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { pontosTrajeto, rotaDesde } from "../lib/trajeto.mjs";
test("trajeto: origem, paradas com controle, destino; rotações alternam", () => {
  const pts = pontosTrajeto({x:0,y:0}, [{x:100,y:300,rot:-6},{x:120,y:900,rot:4}], {x:400,y:1500});
  assert.deepEqual(pts[0], {x:0,y:0,rot:0});
  assert.deepEqual(pts.at(-1), {x:400,y:1500,rot:0});
  assert.equal(pts.length, 1 + 2*2 + 1);
  assert.equal(pts[1].x, 160, "controle 60px para fora antes da parada");
});

test("trajeto direto: sem paradas, um controle em arco (para cima; vertical, para a direita)", () => {
  assert.deepEqual(pontosTrajeto({x:0,y:0}, [], {x:100,y:0}), [{x:0,y:0,rot:0}, {x:50,y:-20,rot:0}, {x:100,y:0,rot:0}]);
  assert.deepEqual(pontosTrajeto({x:100,y:0}, [], {x:0,y:0})[1], {x:50,y:-20,rot:0});
  assert.deepEqual(pontosTrajeto({x:0,y:0}, [], {x:0,y:100})[1], {x:20,y:50,rot:0});
});
test("rota: pontos a partir da partida, relativos a ela", () => {
  assert.deepEqual(rotaDesde("M414.9 107.6L350.6 227.9L342.8 281.8L307.5 387.7", [350.6, 227.9]),
    [{x:0, y:0}, {x:-7.8, y:53.9}, {x:-43.1, y:159.8}]);
});
