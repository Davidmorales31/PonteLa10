import { contextoOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { estadoConexionMeta } from '~/server/utils/publicacionMeta'
import { resolverConfiguracionMetaSocial } from '~/server/utils/configuracionSocialProduccion'

export default defineEventHandler(async evento => {
  await contextoOAuthSocial(evento)
  const config = await resolverConfiguracionMetaSocial(clienteOAuthSocial(evento), useRuntimeConfig(evento))
  return estadoConexionMeta(config)
})
