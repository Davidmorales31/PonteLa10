import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { crearPublicacionPropia } from '~/server/utils/repositorioPublicacionesPropias'
import { crearDocumentoPropio } from '~/utils/editorial/publicacionesPropias'

const esquema = z.object({ titulo: z.string().trim().min(3).max(120).default('Publicación nueva') }).strict()
export default defineEventHandler(async (evento) => {
  const { contexto, privado } = await contextoPublicacionPropia(evento, true)
  const entrada = esquema.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'El título debe tener entre 3 y 120 caracteres.' })
  setResponseStatus(evento, 201)
  return crearPublicacionPropia(privado, contexto.usuario.id, entrada.data.titulo, crearDocumentoPropio())
})
