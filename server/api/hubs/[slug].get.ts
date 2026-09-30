import type { HubPublicoEditorial } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerHubPublico } from '~/server/utils/repositorioHubsPublicos'

export default defineEventHandler(async (evento): Promise<HubPublicoEditorial> => {
  const slug = String(getRouterParam(evento, 'slug') || '')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
  }

  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const hub = await obtenerHubPublico(clienteSupabase, slug)
  if (!hub) {
    setResponseHeader(evento, 'X-Robots-Tag', 'noindex, follow')
    throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  return hub
})
