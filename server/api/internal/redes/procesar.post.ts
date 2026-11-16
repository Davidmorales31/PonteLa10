import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { resolverConfiguracionMetaSocial } from '~/server/utils/configuracionSocialProduccion'
import { credencialMeta } from '~/server/utils/publicacionMeta'
import { procesarColaSocial } from '~/server/utils/procesarColaSocial'
import { barrerTemporalesCaducados } from '~/server/utils/mediosTemporalesSociales'
import { procesarPublicacionesPropiasProgramadas } from '~/server/utils/procesarPublicacionesPropias'

export default defineEventHandler(async evento => {
  setHeader(evento, 'Cache-Control', 'private, no-store')
  const autorizacion = getHeader(evento, 'authorization') || ''
  if (!/^Bearer [a-f0-9]{64}$/.test(autorizacion)) throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) throw createError({ statusCode: 503, statusMessage: 'Programador no disponible.' })
  const permiso = await cliente.rpc('authorize_social_scheduler', { p_token: autorizacion.slice(7) })
  if (permiso.error || permiso.data !== true) throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  try {
    const config = useRuntimeConfig(evento)
    const meta = await resolverConfiguracionMetaSocial(cliente, config)
    // Una cuenta pendiente de renovación no debe desconectar la otra red.
    if (meta.metaAccessToken) credencialMeta(meta, 'instagram')
    if (meta.metaFacebookPageAccessToken) credencialMeta(meta, 'facebook')
    // Latido solo tras autenticar el disparador y comprobar configuración privada.
    const latido = await cliente.from('social_scheduler_state').upsert({ id: true, last_seen_at: new Date().toISOString() })
    if (latido.error) throw new Error('Latido no disponible')
    await procesarColaSocial(cliente, meta, String(config.public.socialSiteUrl || config.public.siteUrl))
    await procesarPublicacionesPropiasProgramadas(cliente, meta)
    await barrerTemporalesCaducados(cliente).catch(() => 0) // borra subidas olvidadas según la retención configurada
    return { activo: true }
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'No se completó el ciclo del programador social.' })
  }
})
