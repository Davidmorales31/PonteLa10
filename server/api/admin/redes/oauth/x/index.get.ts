import { contextoOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { validarConfiguracionOAuthX } from '~/server/utils/oauthX'

export default defineEventHandler(async (evento) => {
  const { contexto } = await contextoOAuthSocial(evento)
  let configurado = false
  try { validarConfiguracionOAuthX(useRuntimeConfig(evento)); configurado = true } catch { /* Estado sin valores privados. */ }
  const puedeConectar = contexto.permisos.includes('configuracion.gestionar')
  let almacenamientoDisponible = false
  let cuenta: { usuario: string, conectadaEn: string, venceEn: string, requiereRenovar: boolean } | null = null
  try {
    const { data, error } = await clienteOAuthSocial(evento).from('social_x_connections')
      .select('username,connected_at,expires_at').eq('provider', 'x').maybeSingle()
    if (!error) {
      almacenamientoDisponible = true
      if (data) cuenta = { usuario: data.username, conectadaEn: data.connected_at, venceEn: data.expires_at,
        requiereRenovar: Date.parse(data.expires_at) <= Date.now() }
    }
  } catch { /* No impedir usar el resto del módulo si falta configuración privada. */ }
  return { configurado, almacenamientoDisponible, puedeConectar, cuenta,
    preparada: configurado && almacenamientoDisponible }
})
