import type { ArticuloPublicoEditorial } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloPublicoEditorial } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (
  evento
): Promise<ArticuloPublicoEditorial> => {
  const slug = String(getRouterParam(evento, 'slug') || '')

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Publicación no encontrada.'
    })
  }

  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloPublicoEditorial(clienteSupabase, slug)

  if (!articulo) {
    setResponseHeader(evento, 'X-Robots-Tag', 'noindex, follow')
    throw createError({
      statusCode: 404,
      statusMessage: 'Publicación no encontrada.'
    })
  }

  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  )

  return articulo
})
