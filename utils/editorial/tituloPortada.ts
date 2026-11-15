/**
 * Titular que se muestra sobre la imagen del centro de noticias (tarjetas,
 * carrusel y destacada). El H1 y los metadatos SEO del artículo siguen usando
 * `titulo`; aquí solo se elige el texto de la tarjeta.
 */
export function obtenerTituloPortada(articulo: { titulo: string, tituloPortada?: string | null }): string {
  const tituloPortada = articulo.tituloPortada?.trim()
  return tituloPortada || articulo.titulo
}
