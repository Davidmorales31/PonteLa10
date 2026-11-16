import { z } from 'zod'
import { contextoOAuthSocial, clienteOAuthSocial, validarOrigenOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { alcancesAgente, generarLlaveAgente } from '~/server/utils/agentesRedes/llaves'

const esquema = z.object({
  nombre: z.string().trim().min(3).max(80),
  alcances: z.array(z.enum(alcancesAgente)).min(1).max(4).default(['leer', 'borradores', 'medios']),
  maxProgramacionesDia: z.number().int().min(0).max(50).default(5),
  limitePorMinuto: z.number().int().min(5).max(600).default(60),
  venceEnDias: z.number().int().min(1).max(365).optional()
}).strict()

/** Crea una llave. La llave completa se devuelve UNA sola vez; en la base solo queda su huella SHA-256. */
export default defineEventHandler(async (evento) => {
  const { contexto } = await contextoOAuthSocial(evento, true)
  validarOrigenOAuthSocial(evento)
  const entrada = esquema.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 422, statusMessage: 'Revisa el nombre (3–80 caracteres), los alcances y los límites.' })
  const cliente = clienteOAuthSocial(evento)
  const { llave, prefijo, huella } = generarLlaveAgente()
  const alcances = [...new Set(entrada.data.alcances)]
  const vence = entrada.data.venceEnDias ? new Date(Date.now() + entrada.data.venceEnDias * 86_400_000).toISOString() : null
  const { data, error } = await cliente.from('social_agent_keys').insert({ name: entrada.data.nombre, key_prefix: prefijo, key_hash: huella, owner_id: contexto.usuario.id,
    scopes: alcances, max_schedules_per_day: entrada.data.maxProgramacionesDia, rate_limit_per_minute: entrada.data.limitePorMinuto, expires_at: vence }).select('id,created_at').single()
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'No se pudo crear la llave.' })
  await cliente.from('editorial_audit_log').insert({ actor_id: contexto.usuario.id, action: 'social.agent_key.created', entity_type: 'social_agent_key', entity_id: data.id,
    metadata: { name: entrada.data.nombre, scopes: alcances, expiresAt: vence } })
  setResponseStatus(evento, 201)
  return { id: data.id, llave, prefijo, nombre: entrada.data.nombre, alcances, venceEn: vence }
})
