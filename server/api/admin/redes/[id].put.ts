import { z } from 'zod'
import { contextoPublicacionSocial } from '~/server/utils/contextoPublicacionSocial'
import { guardarBorradorSocial, validarMediosSociales } from '~/server/utils/repositorioPublicacionesSociales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaDocumentoSocial } from '~/utils/editorial/publicacionesSociales'
import { validarPublicacionSocialLista } from '~/server/utils/recursosComposicionSocial'

export default defineEventHandler(async (evento) => {
  const { cliente, articulo, dominio } = await contextoPublicacionSocial(evento, true)
  const entrada = validarEntradaEditorial(z.object({ documento: esquemaDocumentoSocial,
    revision: z.number().int().min(0), estado: z.enum(['draft', 'ready']) }).strict(), await readBody(evento))
  if (entrada.estado === 'ready') await validarPublicacionSocialLista(entrada.documento, await validarMediosSociales(cliente, entrada.documento), dominio)
  return guardarBorradorSocial(cliente, articulo.id, entrada.documento, entrada.revision, entrada.estado)
})
