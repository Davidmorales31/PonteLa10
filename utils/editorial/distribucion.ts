import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

export type RedCompartirArticulo = 'facebook' | 'whatsapp' | 'x'

export function crearUrlCompartirArticulo(
  red: RedCompartirArticulo,
  url: string,
  titulo: string
): string {
  const urlCodificada = encodeURIComponent(url)
  const tituloCodificado = encodeURIComponent(titulo)

  if (red === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${urlCodificada}`
  }

  if (red === 'whatsapp') {
    return `https://api.whatsapp.com/send?text=${tituloCodificado}%20${urlCodificada}`
  }

  return `https://twitter.com/intent/tweet?text=${tituloCodificado}&url=${urlCodificada}`
}

export function seleccionarArticulosRelacionados(
  articulos: ResumenArticuloPublico[],
  articuloActualId: string,
  categoriaActual: string,
  limite = 3
): ResumenArticuloPublico[] {
  return articulos
    .filter(articulo => articulo.id !== articuloActualId)
    .sort((primero, segundo) => {
      const prioridadPrimero = primero.categoria === categoriaActual ? 1 : 0
      const prioridadSegundo = segundo.categoria === categoriaActual ? 1 : 0

      if (prioridadPrimero !== prioridadSegundo) {
        return prioridadSegundo - prioridadPrimero
      }

      return new Date(segundo.publicadoEn).getTime()
        - new Date(primero.publicadoEn).getTime()
    })
    .slice(0, Math.max(0, limite))
}
