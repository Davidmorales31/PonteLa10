import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { crearPublicacionPropia } from '~/server/utils/repositorioPublicacionesPropias'
import { crearDocumentoPropio, crearDocumentoVideoPropio } from '~/utils/editorial/publicacionesPropias'

const esquema = z.object({ titulo: z.string().trim().min(3).max(120).default('Publicación nueva'), tipo: z.enum(['imagenes', 'video']).default('imagenes') }).strict()
export default defineEventHandler(async (evento) => {
  const { contexto, privado } = await contextoPublicacionPropia(evento, true)
  const entrada = esquema.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'El título debe tener entre 3 y 120 caracteres.' })
  setResponseStatus(evento, 201)
  return crearPublicacionPropia(privado, contexto.usuario.id, entrada.data.titulo, entrada.data.tipo === 'video' ? crearDocumentoVideoPropio() : crearDocumentoPropio())
})
