import { contextoOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { estadoConexionMeta } from '~/server/utils/publicacionMeta'

export default defineEventHandler(async evento => {
  await contextoOAuthSocial(evento)
  return estadoConexionMeta(useRuntimeConfig(evento))
})
