import { z } from 'zod'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { actualizarPortadaRapidaEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

const esquemaPortadaRapida = z.object({
  versionBloqueo: z.number().int().positive(),
  portadaId: z.string().uuid()
})

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaPortadaRapida, await readBody(evento))
  return actualizarPortadaRapidaEditorial(
    obtenerClienteSupabaseEditorial(evento),
    articuloId,
    entrada.versionBloqueo,
    entrada.portadaId
  )
})
