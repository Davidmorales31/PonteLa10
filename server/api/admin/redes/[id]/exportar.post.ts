import { z } from 'zod'
import { contextoPublicacionSocial } from '~/server/utils/contextoPublicacionSocial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaDiapositivaSocial } from '~/utils/editorial/publicacionesSociales'
import { renderizarDiapositivaSocial } from '~/server/utils/renderizadorPublicacionSocial'

export default defineEventHandler(async (evento) => {
  const { cliente, dominio } = await contextoPublicacionSocial(evento, true)
  const entrada = validarEntradaEditorial(z.object({ diapositiva: esquemaDiapositivaSocial,
    formato: z.enum(['cuadrado', 'vertical', 'historia', 'web', 'miniatura']) }).strict(), await readBody(evento))
  const imagen = await renderizarDiapositivaSocial(cliente, entrada.diapositiva, entrada.formato, dominio)
  const extension = imagen.tipoMime === 'image/jpeg' ? 'jpg' : 'png'
  setHeader(evento, 'Content-Type', imagen.tipoMime)
  setHeader(evento, 'Content-Disposition', `attachment; filename="pont3la10-${entrada.formato}.${extension}"`)
  return imagen.bytes
})
