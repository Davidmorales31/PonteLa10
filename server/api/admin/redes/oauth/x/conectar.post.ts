import { getRequestURL, setCookie } from 'h3'
import { contextoOAuthSocial, clienteOAuthSocial, validarOrigenOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { crearSolicitudOAuthX, validarConfiguracionOAuthX, nombreCookieX, rutaRetornoX } from '~/server/utils/oauthX'

export default defineEventHandler(async (evento) => {
  const { contexto } = await contextoOAuthSocial(evento, true)
  validarOrigenOAuthSocial(evento)
  const config = validarConfiguracionOAuthX(useRuntimeConfig(evento))
  if (getRequestURL(evento).origin !== new URL(config.redirectUri).origin) throw createError({ statusCode: 409,
    statusMessage: 'Abre el panel en el mismo origen que la URL de retorno de X configurada en el servidor.' })
  const solicitud = crearSolicitudOAuthX(config)
  const { error } = await clienteOAuthSocial(evento).rpc('begin_social_x_oauth', {
    p_actor_id: contexto.usuario.id, p_state_hash: solicitud.stateHash, p_browser_hash: solicitud.browserHash, p_flow: solicitud.flow
  })
  if (error) throw createError({ statusCode: error.code === 'P0001' ? 429 : 503,
    statusMessage: error.code === 'P0001' ? 'Hay demasiados intentos de conexión. Espera diez minutos.' : 'No se pudo reservar la autorización. Comprueba la migración de conexiones.' })
  setCookie(evento, nombreCookieX, solicitud.navegador, { httpOnly: true, secure: new URL(config.redirectUri).protocol === 'https:', sameSite: 'lax', path: rutaRetornoX, maxAge: 600 })
  return { url: solicitud.url }
})
