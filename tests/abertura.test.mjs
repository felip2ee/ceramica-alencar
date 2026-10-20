// site/tests/abertura.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { gradePlaquetas, cronograma, deveRodarAbertura } from "../lib/abertura.mjs";
import { LOGO_PATHS, LOGO_VIEWBOX } from "../figures/out/figures.js";
const g = gradePlaquetas({cols:4, rows:3, larg:48, alt:14, gap:3, x0:0, y0:100});
test("aparelho corrido: fileira ímpar desloca meia peça", () => {
  const r0 = g.filter(p=>p.row===0), r1 = g.filter(p=>p.row===1);
  assert.equal(r1[0].x - r0[0].x, (48+3)/2);
  assert.equal(r0[0].y - r1[0].y, 14+3);
});
test("quatro tons da marca", () => {
  assert.deepEqual([...new Set(g.map(p=>p.tom))].sort(), ["#8E4529","#A85D3A","#B65E3C","#C9896A"]);
});
test("cronograma determinístico e por fileira", () => {
  const a = cronograma(g, {seed:7}), b = cronograma(g, {seed:7});
  assert.deepEqual(a, b);
  const maxR0 = Math.max(...a.filter((_,i)=>g[i].row===0)), minR2 = Math.min(...a.filter((_,i)=>g[i].row===2));
  assert.ok(minR2 > maxR0);
});
test("deveRodarAbertura", () => {
  const mem = new Map(); const storage = { getItem:k=>mem.get(k)??null, setItem:(k,v)=>mem.set(k,v) };
  assert.equal(deveRodarAbertura({search:"", storage, reduceMotion:false}), true);
  storage.setItem("alencar:abertura","1");
  assert.equal(deveRodarAbertura({search:"", storage, reduceMotion:false}), false);
  assert.equal(deveRodarAbertura({search:"?abertura=1", storage, reduceMotion:false}), true);
  assert.equal(deveRodarAbertura({search:"?abertura=1", storage, reduceMotion:true}), false);
  const quebrado = { getItem(){ throw new Error("private"); }, setItem(){ throw new Error("private"); } };
  assert.equal(deveRodarAbertura({search:"", storage:quebrado, reduceMotion:false}), true);
});
test("LOGO_PATHS tem os 4 paths limpos", () => {
  assert.equal((LOGO_PATHS.match(/<path/g)||[]).length, 4);
  assert.doesNotMatch(LOGO_PATHS, /ns0:|fill=/);
  assert.equal(LOGO_VIEWBOX, "0 0 549 493");
});
