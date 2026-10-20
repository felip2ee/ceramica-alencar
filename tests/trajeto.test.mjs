// site/tests/trajeto.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { pontosTrajeto, rotaDesde, noArco, poligonosCarga } from "../lib/trajeto.mjs";
test("trajeto: origem, paradas com controle, destino; rotações alternam", () => {
  const pts = pontosTrajeto({x:0,y:0}, [{x:100,y:300,rot:-6},{x:120,y:900,rot:4}], {x:400,y:1500});
  assert.deepEqual(pts[0], {x:0,y:0,rot:0});
  assert.deepEqual(pts.at(-1), {x:400,y:1500,rot:0});
  assert.equal(pts.length, 1 + 2*2 + 1);
  assert.equal(pts[1].x, 160, "controle 60px para fora antes da parada");
});

test("trajeto direto: um controle em arco, para a direita; para cima se o destino fica bem à esquerda", () => {
  assert.deepEqual(pontosTrajeto({x:0,y:0}, [], {x:100,y:0}), [{x:0,y:0,rot:0}, {x:70,y:0,rot:0}, {x:100,y:0,rot:0}]);
  assert.deepEqual(pontosTrajeto({x:100,y:0}, [], {x:0,y:0}, 200)[1], {x:50,y:-20,rot:0}, "dx < -25% da tela: arco para cima");
  assert.equal(pontosTrajeto({x:100,y:0}, [], {x:0,y:0}, 1000)[1].y, 0, "dx > -25% da tela: arco para a direita");
});
test("trajeto direto quase vertical: dx = -1 e dx = +1 arqueiam para o mesmo lado", () => {
  const esq = pontosTrajeto({x:100,y:0}, [], {x:99,y:300}, 390)[1];
  const dir = pontosTrajeto({x:100,y:0}, [], {x:101,y:300}, 390)[1];
  assert.ok(esq.x > 100 && dir.x > 100, "os dois para a direita");
  assert.ok(Math.abs(esq.x - dir.x) < 2 && esq.y === dir.y, "sem salto de lado");
});
test("noArco: extremos e meio da Bézier quadrática", () => {
  const pts = [{x:0,y:0}, {x:50,y:-20}, {x:100,y:0}];
  assert.deepEqual(noArco(pts, 0), {x:0,y:0});
  assert.deepEqual(noArco(pts, 1), {x:100,y:0});
  assert.deepEqual(noArco(pts, 0.5), {x:50,y:-10});
});
test("poligonosCarga: a plaqueta extra fica dentro da carroceria", () => {
  const car = {sx:320.8, sy:143.9, w:68.8, h:64.9};
  const { topo, frente } = poligonosCarga(car);
  assert.equal(topo.length, 4); assert.equal(frente.length, 4);
  for (const [x, y] of [...topo, ...frente]) {
    assert.ok(x >= car.sx && x <= car.sx + car.w && y >= car.sy && y <= car.sy + car.h, `${x},${y}`);
  }
  assert.deepEqual(frente[0], topo[3], "frente nasce da aresta de baixo do topo");
});
test("rota: pontos a partir da partida, relativos a ela", () => {
  assert.deepEqual(rotaDesde("M414.9 107.6L350.6 227.9L342.8 281.8L307.5 387.7", [350.6, 227.9]),
    [{x:0, y:0}, {x:-7.8, y:53.9}, {x:-43.1, y:159.8}]);
});
