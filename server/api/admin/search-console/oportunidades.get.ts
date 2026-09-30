import { getQuery, setResponseHeader } from 'h3'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerOportunidadesSearchConsole } from '~/server/utils/repositorioSearchConsole'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'searchConsole.ver', { exigirMfa: true })
  setResponseHeader(evento, 'Cache-Control', 'no-store')

  const consulta = getQuery(evento)
  return obtenerOportunidadesSearchConsole(
    obtenerClienteSupabaseEditorial(evento),
    consulta.desde,
    consulta.hasta
  )
})
