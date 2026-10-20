import { test } from "node:test"; import assert from "node:assert/strict";
import { linkWhatsapp, MENSAGEM_PADRAO } from "../lib/whatsapp.mjs";
test("monta wa.me com 55 e mensagem codificada", () => {
  assert.equal(linkWhatsapp("(63) 99999-0000", "Olá, vim pelo site"), "https://wa.me/5563999990000?text=Ol%C3%A1%2C%20vim%20pelo%20site");
});
test("não duplica 55 quando já vem com DDI", () => {
  assert.equal(linkWhatsapp("+55 63 99999-0000", "x"), "https://wa.me/5563999990000?text=x");
});
test("placeholder gera link para #contato", () => {
  assert.equal(linkWhatsapp("WHATSAPP_NUMERO", "x"), "#contato");
});
test("mensagem padrão é curta e cita a plaqueta", () => {
  assert.ok(MENSAGEM_PADRAO.length < 120); assert.match(MENSAGEM_PADRAO, /plaqueta/);
});
