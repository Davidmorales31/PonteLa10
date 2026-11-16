import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { cancelarProgramacionPropia } from '~/server/utils/repositorioPublicacionesPropias'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'

export default defineEventHandler(async (evento) => {
  const { contexto, privado } = await contextoPublicacionPropia(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  return cancelarProgramacionPropia(privado, id, contexto.usuario.id)
})
