import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { guardarPublicacionPropia, validarMediosPropios } from '~/server/utils/repositorioPublicacionesPropias'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaGuardarPublicacionPropia } from '~/utils/editorial/publicacionesPropias'

export default defineEventHandler(async (evento) => {
  const { contexto, cliente, privado } = await contextoPublicacionPropia(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  const entrada = esquemaGuardarPublicacionPropia.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 422, statusMessage: 'La publicación no cumple el formato esperado.' })
  await validarMediosPropios(cliente, entrada.data.documento)
  const publicacion = await guardarPublicacionPropia(privado, id, contexto.usuario.id, entrada.data)
  return { publicacion, medios: await validarMediosPropios(cliente, publicacion.documento) }
})
