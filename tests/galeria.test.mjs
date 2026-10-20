import { test } from "node:test"; import assert from "node:assert/strict";
import { filtrarGaleria } from "../lib/galeria.mjs";
const itens = [{ambiente:"fachada",tom:"escuro"},{ambiente:"sala",tom:"medio"},{ambiente:"sala",tom:"claro"}];
test("sem filtro mostra tudo", () => assert.deepEqual(filtrarGaleria(itens, {}), [true,true,true]));
test("filtra por ambiente", () => assert.deepEqual(filtrarGaleria(itens, {ambiente:"sala"}), [false,true,true]));
test("combina ambiente e tom", () => assert.deepEqual(filtrarGaleria(itens, {ambiente:"sala",tom:"claro"}), [false,false,true]));
test("null é igual a sem filtro", () => assert.deepEqual(filtrarGaleria(itens, {ambiente:null,tom:"medio"}), [false,true,false]));
import { todosOcultos } from "../lib/galeria.mjs";
test("todosOcultos: só quando há figuras e nenhuma aparece", () => {
  assert.equal(todosOcultos(filtrarGaleria(itens, {ambiente:"sala",tom:"escuro"})), true);
  assert.equal(todosOcultos(filtrarGaleria(itens, {ambiente:"sala"})), false);
  assert.equal(todosOcultos([]), false);
});
