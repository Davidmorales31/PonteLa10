import { getRouterParam } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerFichaEquipoLigaPublica } from '~/server/utils/equiposLigaPublicos'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'No encontramos ese equipo.' })
  }

  const cliente = obtenerClienteSupabaseAnonimo(evento)
  const ficha = await obtenerFichaEquipoLigaPublica(cliente, slug)
  if (!ficha) throw createError({ statusCode: 404, statusMessage: 'No encontramos ese equipo.' })

  aplicarCachePublica(evento, 'equipo')
  return ficha
})
