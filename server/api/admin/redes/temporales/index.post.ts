import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { iniciarTemporalSocial } from '~/server/utils/mediosTemporalesSociales'
import { esquemaIniciarTemporalSocial } from '~/utils/editorial/mediosTemporales'

/** Prepara una subida directa del dispositivo a Storage privado: el archivo nunca pasa por el servidor. */
export default defineEventHandler(async (evento) => {
  const { contexto, privado } = await contextoPublicacionPropia(evento, true)
  const entrada = esquemaIniciarTemporalSocial.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 422, statusMessage: 'Solo se admiten imágenes JPG, PNG o WebP y vídeos MP4 o MOV.' })
  setResponseStatus(evento, 201)
  return iniciarTemporalSocial(privado, contexto.usuario.id, entrada.data)
})
