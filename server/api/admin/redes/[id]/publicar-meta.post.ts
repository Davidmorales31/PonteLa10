import { z } from 'zod'
import { contextoPublicacionSocial } from '~/server/utils/contextoPublicacionSocial'
import { clienteOAuthSocial, validarOrigenOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { ejecutarPublicacionMeta } from '~/server/utils/ejecutarPublicacionMeta'

const esquemaSolicitudMeta = z.object({ confirmar: z.literal(true), destino: z.enum(['facebook', 'instagram']),
  revision: z.number().int().nonnegative(), versionArticulo: z.number().int().nonnegative() }).strict()
export default defineEventHandler(async evento => {
  const contexto = await contextoPublicacionSocial(evento, true)
  validarOrigenOAuthSocial(evento)
  const entrada = esquemaSolicitudMeta.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'Confirma el destino y la versi?n desde Vista r?pida.' })
  return ejecutarPublicacionMeta(contexto, entrada.data, clienteOAuthSocial(evento), useRuntimeConfig(evento))
})
