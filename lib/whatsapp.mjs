export const MENSAGEM_PADRAO = "Olá, vim pelo site e quero conversar sobre a plaqueta de barro.";

export function linkWhatsapp(numero, mensagem) {
  const digitos = String(numero ?? "").replace(/\D/g, "");
  if (numero === "WHATSAPP_NUMERO" || !digitos) return "#contato";
  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensagem)}`;
}
