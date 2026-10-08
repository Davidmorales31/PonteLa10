import { getQuery, setResponseHeader } from 'h3'
import { leerSlugsEquiposSeguidos } from '~/utils/seguimientoEquipos'
import { obtenerResumenesEquiposSeguidos } from '~/server/utils/equiposLigaPublicos'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'

export default defineEventHandler(async (evento) => {
  setResponseHeader(evento, 'Cache-Control', 'private, no-store')

  const slugs = leerSlugsEquiposSeguidos(getQuery(evento).slugs)
  if (!slugs) {
    throw createError({ statusCode: 400, statusMessage: 'La lista de equipos seguidos no es válida.' })
  }

  const cliente = obtenerClienteSupabaseAnonimo(evento)
  return obtenerResumenesEquiposSeguidos(cliente, slugs)
})
