import type { ResultadoDetectorHuerfanasSeo } from '~/server/utils/grafoEntidadesSeo'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { detectarPaginasSeoSinEnlacesContextuales } from '~/server/utils/grafoEntidadesSeo'

export default defineEventHandler(async (evento): Promise<ResultadoDetectorHuerfanasSeo> => {
  await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return detectarPaginasSeoSinEnlacesContextuales(obtenerClienteSupabaseEditorial(evento))
})
