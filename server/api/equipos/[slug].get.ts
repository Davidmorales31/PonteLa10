import { getRouterParam, setResponseHeader } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerFichaEquipoLigaPublica } from '~/server/utils/equiposLigaPublicos'

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'No encontramos ese equipo.' })
  }

  const cliente = obtenerClienteSupabaseAnonimo(evento)
  const ficha = await obtenerFichaEquipoLigaPublica(cliente, slug)
  if (!ficha) throw createError({ statusCode: 404, statusMessage: 'No encontramos ese equipo.' })

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60')
  return ficha
})
