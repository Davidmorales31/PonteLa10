import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { guardarPublicacionPropia, validarMediosPropios } from '~/server/utils/repositorioPublicacionesPropias'
import { vincularTemporalesSociales } from '~/server/utils/mediosTemporalesSociales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaGuardarPublicacionPropia } from '~/utils/editorial/publicacionesPropias'

export default defineEventHandler(async (evento) => {
  const { contexto, cliente, privado } = await contextoPublicacionPropia(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  const entrada = esquemaGuardarPublicacionPropia.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 422, statusMessage: 'La publicación no cumple el formato esperado.' })
  await validarMediosPropios(cliente, privado, entrada.data.documento)
  const publicacion = await guardarPublicacionPropia(privado, id, contexto.usuario.id, entrada.data)
  await vincularTemporalesSociales(privado, id, publicacion.documento)
  const archivos = await validarMediosPropios(cliente, privado, publicacion.documento)
  return { publicacion, medios: archivos.medios, temporales: archivos.temporales }
})
