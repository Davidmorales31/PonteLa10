import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { leerPublicacionPropia, leerRecibosPublicacionPropia, validarMediosPropios } from '~/server/utils/repositorioPublicacionesPropias'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'

export default defineEventHandler(async (evento) => {
  const { cliente, privado } = await contextoPublicacionPropia(evento)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  const publicacion = await leerPublicacionPropia(privado, id)
  const [medios, recibos] = await Promise.all([validarMediosPropios(cliente, publicacion.documento).catch(() => []), leerRecibosPublicacionPropia(privado, id)])
  return { publicacion, medios, recibos }
})
