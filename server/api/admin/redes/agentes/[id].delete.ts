import { z } from 'zod'
import { contextoOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'

export default defineEventHandler(async (evento) => {
  const { contexto } = await contextoOAuthSocial(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  if (getHeader(evento, 'origin') !== getRequestURL(evento).origin) throw createError({ statusCode: 403, statusMessage: 'Origen no permitido.' })
  const cliente = clienteOAuthSocial(evento)
  const { data, error } = await cliente.from('social_agent_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id).is('revoked_at', null).select('id,name').maybeSingle()
  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudo revocar la llave.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'La llave no existe o ya estaba revocada.' })
  await cliente.from('editorial_audit_log').insert({ actor_id: contexto.usuario.id, action: 'social.agent_key.revoked', entity_type: 'social_agent_key', entity_id: id, metadata: { name: data.name } })
  return { revocada: true }
})
