export function filtrarGaleria(itens, filtro) {
  return itens.map((item) =>
    (!filtro.ambiente || item.ambiente === filtro.ambiente) &&
    (!filtro.tom || item.tom === filtro.tom));
}

export const todosOcultos = (visiveis) => visiveis.length > 0 && visiveis.every((v) => !v);
