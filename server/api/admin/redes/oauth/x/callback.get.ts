import { deleteCookie, getCookie, getQuery, getRequestURL, sendRedirect } from 'h3'
import { z } from 'zod'
import { contextoOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { cifrarOAuthX, descifrarOAuthX, esquemaRetornoX, huellaOAuthX, intercambiarCodigoOAuthX,
  nombreCookieX, rutaRetornoX, validarConfiguracionOAuthX } from '~/server/utils/oauthX'

export default defineEventHandler(async (evento) => {
  // Siempre revalidar la sesión editorial y MFA, también al volver desde X.
  const { contexto } = await contextoOAuthSocial(evento, true)
  const terminar = (resultado: string) => sendRedirect(evento, `/admin/redes/cuentas?resultadoX=${resultado}`, 303)
  const navegador = getCookie(evento, nombreCookieX)
  deleteCookie(evento, nombreCookieX, { path: rutaRetornoX })
  const consulta = getQuery(evento)
  const entrada = esquemaRetornoX.safeParse(consulta)
  if (!entrada.success || !navegador || !/^[A-Za-z0-9_-]{43}$/.test(navegador)) return terminar('autorizacion_invalida')
  try {
    const config = validarConfiguracionOAuthX(useRuntimeConfig(evento))
    if (getRequestURL(evento).origin !== new URL(config.redirectUri).origin) return terminar('autorizacion_invalida')
    const cliente = clienteOAuthSocial(evento)
    const stateHash = huellaOAuthX(entrada.data.state)
    const { data, error } = await cliente.rpc('consume_social_x_oauth', {
      p_actor_id: contexto.usuario.id, p_state_hash: stateHash, p_browser_hash: huellaOAuthX(navegador)
    })
    const intento = z.object({ id: z.string().uuid(), encrypted_flow: z.string().max(24000) }).safeParse(data)
    if (error || !intento.success) return terminar('autorizacion_invalida')
    if (typeof consulta.error === 'string' && consulta.error.length <= 200) return terminar('cancelada')
    if (!entrada.data.code) return terminar('autorizacion_invalida')
    const flujo = z.object({ verifier: z.string().regex(/^[A-Za-z0-9_-]{64}$/), redirectUri: z.string() }).parse(
      descifrarOAuthX(intento.data.encrypted_flow, config.clave, `x:flow:${stateHash}`))
    if (flujo.redirectUri !== config.redirectUri) return terminar('autorizacion_invalida')
    const { perfil, token } = await intercambiarCodigoOAuthX(config, entrada.data.code, flujo.verifier)
    const { error: errorGuardado } = await cliente.rpc('save_social_x_connection', {
      p_actor_id: contexto.usuario.id, p_attempt_id: intento.data.id,
      p_provider_user_id: perfil.id, p_username: perfil.username,
      p_token_cipher: cifrarOAuthX(token, config.clave, 'x:tokens:Pont3la10'),
      p_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(), p_scopes: token.scope.split(' ')
    })
    return terminar(errorGuardado ? 'guardado_fallido' : 'conectada')
  } catch (error) {
    const cuentaIncorrecta = (error as { data?: { codigo?: string } }).data?.codigo === 'CUENTA_X_INCORRECTA'
    return terminar(cuentaIncorrecta ? 'cuenta_incorrecta' : 'conexion_fallida')
  }
})
