import { getRouterParam, setResponseHeader } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarArticulosPublicosPorEntidad } from '~/server/utils/repositorioContenidoEditorial'
import type { TipoEntidadSeo } from '~/types/contenidoEditorial'

const tiposEntidadPublica = new Set<TipoEntidadSeo>([
  'article', 'match', 'team', 'player', 'competition'
])

export default defineEventHandler(async (evento) => {
  const tipo = getRouterParam(evento, 'tipo') || ''
  const slug = getRouterParam(evento, 'slug') || ''
  if (!tiposEntidadPublica.has(tipo as TipoEntidadSeo)
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    || slug.length > 120) {
    throw createError({ statusCode: 404, statusMessage: 'No encontramos esa entidad pública.' })
  }

  const articulos = await listarArticulosPublicosPorEntidad(
    obtenerClienteSupabaseAnonimo(evento),
    tipo as TipoEntidadSeo,
    slug,
    12
  )
  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60')
  return articulos
})
