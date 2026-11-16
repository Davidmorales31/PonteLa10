import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'configuracion.gestionar')
  setHeader(evento, 'Cache-Control', 'private, no-store')
  const { data, error } = await clienteOAuthSocial(evento).from('social_agent_keys')
    .select('id,name,key_prefix,scopes,max_schedules_per_day,rate_limit_per_minute,expires_at,revoked_at,last_used_at,created_at').order('created_at', { ascending: false }).limit(50)
  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudieron consultar las llaves.' })
  return { llaves: (data || []).map(fila => ({ id: fila.id, nombre: fila.name, prefijo: fila.key_prefix, alcances: fila.scopes as string[], maxProgramacionesDia: fila.max_schedules_per_day,
    limitePorMinuto: fila.rate_limit_per_minute, venceEn: fila.expires_at as string | null, revocadaEn: fila.revoked_at as string | null, ultimoUsoEn: fila.last_used_at as string | null, creadaEn: fila.created_at as string })) }
})
