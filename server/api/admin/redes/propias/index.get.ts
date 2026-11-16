import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { listarPublicacionesPropias } from '~/server/utils/repositorioPublicacionesPropias'

export default defineEventHandler(async (evento) => {
  const { privado } = await contextoPublicacionPropia(evento)
  return { publicaciones: await listarPublicacionesPropias(privado) }
})
