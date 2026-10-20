export function filtrarGaleria(itens, filtro) {
  return itens.map((item) =>
    (!filtro.ambiente || item.ambiente === filtro.ambiente) &&
    (!filtro.tom || item.tom === filtro.tom));
}
