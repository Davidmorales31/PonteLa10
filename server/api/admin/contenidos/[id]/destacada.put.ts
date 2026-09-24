import { z } from 'zod'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { actualizarNoticiaDestacadaEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

const esquemaDestacada = z.object({ activa: z.boolean() })

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'contenido.publicar', { exigirMfa: true })
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaDestacada, await readBody(evento))
  return actualizarNoticiaDestacadaEditorial(obtenerClienteSupabaseEditorial(evento), articuloId, entrada.activa)
})
