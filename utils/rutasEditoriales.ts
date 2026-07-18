export function obtenerRutaArticulo(slug: string) {
  return `/articulos/${slug}`
}

export function obtenerArticulosPorCategoria<T extends { categoria: string }>(articulos: T[], categoria: string) {
  return articulos.filter((articulo) => articulo.categoria === categoria)
}
