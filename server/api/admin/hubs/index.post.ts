import type { HubEditorialResumen } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearHubEditorial } from '~/server/utils/repositorioHubsPublicos'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaCrearHubPublico } from '~/utils/editorial/hubs'

export default defineEventHandler(async (evento): Promise<HubEditorialResumen> => {
  await exigirPermisoEditorial(evento, 'hub.gestionar')
  const datos = validarEntradaEditorial(esquemaCrearHubPublico, await readBody(evento))
  const resultado = await crearHubEditorial(
    obtenerClienteSupabaseEditorial(evento),
    datos
  )
  setResponseStatus(evento, 201)
  return resultado
})
