import type { FiltrosConsultaArticulos } from '~/utils/articulosLanding'

export const limiteArticulosPorPagina = 20
const desplazamientoMaximoArticulosPublicos = 100_000
const paginasArticulosIndexables = new Set([
  'colombia',
  'futbol',
  'futbol-colombiano',
  'futbol-mundial',
  'gaming',
  'opinion',
  'tecnologia',
  'tendencias'
])

export function leerPaginaArticulosPublica(valor: unknown): number | null {
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) return null

  const pagina = Number(valor)
  const paginaMaxima = Math.floor(desplazamientoMaximoArticulosPublicos / limiteArticulosPorPagina) + 1
  return Number.isSafeInteger(pagina) && pagina <= paginaMaxima ? pagina : null
}

export function leerPaginaDesdeRutaArticulos(ruta: string): number | null {
  if (ruta === '/articulos' || ruta === '/articulos/') return 1

  const coincidencia = ruta.match(/^\/articulos\/pagina\/([^/]+)\/?$/)
  return coincidencia ? leerPaginaArticulosPublica(coincidencia[1]) : null
}

export function esPaginaArticulosSinResultados(
  pagina: number,
  cantidadArticulos: number,
  estado: 'idle' | 'pending' | 'success' | 'error'
): boolean {
  return pagina > 1 && estado === 'success' && cantidadArticulos === 0
}

export function esCategoriaArticulosIndexable(categoria: unknown): categoria is string {
  return typeof categoria === 'string'
    && paginasArticulosIndexables.has(categoria.trim().toLocaleLowerCase('es-CO'))
}

export function construirRutaPaginaArticulos(
  pagina: number,
  filtros: FiltrosConsultaArticulos = {}
): string {
  const ruta = pagina <= 1 ? '/articulos' : `/articulos/pagina/${pagina}`
  const parametros = new URLSearchParams()

  if (filtros.categoria) parametros.set('categoria', filtros.categoria)
  if (filtros.tema) parametros.set('tema', filtros.tema)
  if (filtros.buscar) parametros.set('buscar', filtros.buscar)

  const consulta = parametros.toString()
  return consulta ? `${ruta}?${consulta}` : ruta
}
