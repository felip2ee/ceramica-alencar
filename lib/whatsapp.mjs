export const MENSAGEM_PADRAO = "Olá, vim pelo site e quero conversar sobre a plaqueta de barro.";

export function linkWhatsapp(numero, mensagem) {
  if (numero === "WHATSAPP_NUMERO") return "#contato";
  const digitos = numero.replace(/\D/g, "");
  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensagem)}`;
}
