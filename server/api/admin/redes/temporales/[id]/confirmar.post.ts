import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { confirmarTemporalSocial } from '~/server/utils/mediosTemporalesSociales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'

export default defineEventHandler(async (evento) => {
  const { contexto, privado } = await contextoPublicacionPropia(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  return confirmarTemporalSocial(privado, contexto.usuario.id, id)
})
