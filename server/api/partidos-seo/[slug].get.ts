import { getRouterParam } from 'h3'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerPartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

export default defineCachedEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (slug.length > 240 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'La dirección del partido no es válida.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=15, s-maxage=30')
  return { partido: await obtenerPartidoSeoPublico(obtenerClienteSupabaseEditorial(evento), slug) }
}, {
  maxAge: 30,
  swr: false,
  getKey: evento => `partido-seo-publico-${getRouterParam(evento, 'slug') || 'invalido'}`
})
