import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

const tiposEditorialesValidos = new Set([
  'breve',
  'noticia',
  'analisis',
  'blog',
  'informe',
  'opinion',
  'especial'
])

/** Evita tratar cuerpos de error de la API como artículos de portada. */
export function esResumenArticuloPublico(valor: unknown): valor is ResumenArticuloPublico {
  if (!valor || typeof valor !== 'object') return false

  const articulo = valor as Partial<ResumenArticuloPublico>
  return typeof articulo.id === 'string'
    && articulo.id.length > 0
    && typeof articulo.tipo === 'string'
    && tiposEditorialesValidos.has(articulo.tipo)
    && typeof articulo.slug === 'string'
    && articulo.slug.length > 0
    && typeof articulo.titulo === 'string'
    && typeof articulo.resumen === 'string'
    && typeof articulo.autorNombre === 'string'
    && typeof articulo.categoria === 'string'
    && typeof articulo.imagen === 'string'
    && (articulo.imagenAncho === undefined
      || (Number.isSafeInteger(articulo.imagenAncho) && articulo.imagenAncho > 0 && articulo.imagenAncho <= 2500))
    && typeof articulo.publicadoEn === 'string'
    && Number.isFinite(Date.parse(articulo.publicadoEn))
    && (articulo.modificadoEn === undefined
      || articulo.modificadoEn === null
      || (typeof articulo.modificadoEn === 'string' && Number.isFinite(Date.parse(articulo.modificadoEn))))
    && (articulo.lecturaMinutos === undefined || typeof articulo.lecturaMinutos === 'number')
}
