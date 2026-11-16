import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getHeader } from 'h3'
import type { H3Event } from 'h3'
import { errores } from './errores'

export const alcancesAgente = ['leer', 'borradores', 'medios', 'programar'] as const
export type AlcanceAgente = (typeof alcancesAgente)[number]
export const formatoLlaveAgente = /^p3l_[A-Za-z0-9_-]{43}$/

export const descripcionAlcances: Record<AlcanceAgente, string> = {
  leer: 'Consultar publicaciones, previsualizar y buscar en la biblioteca.',
  borradores: 'Crear, editar y eliminar borradores propios y pedir aprobación humana.',
  medios: 'Subir imágenes y vídeos temporales o importar imágenes desde una URL pública.',
  programar: 'Programar y cancelar publicaciones propias SIN aprobación humana previa (delegación explícita).'
}

export function huellaLlave(llave: string) { return createHash('sha256').update(llave).digest('hex') }

/** 32 bytes aleatorios: la llave completa se muestra una sola vez y solo se guarda su huella SHA-256. */
export function generarLlaveAgente() {
  const llave = `p3l_${randomBytes(32).toString('base64url')}`
  return { llave, prefijo: llave.slice(0, 12), huella: huellaLlave(llave) }
}

export interface LlaveAgente {
  id: string, nombre: string, propietarioId: string, alcances: Set<AlcanceAgente>, maxProgramacionesDia: number, limitePorMinuto: number
}
export interface ContextoAgente { llave: LlaveAgente, privado: SupabaseClient, cabeceraIdempotencia?: string }

/** Cliente de servicio exclusivo de esta API (tiempo de espera mayor: mueve imágenes y consulta Storage). */
export function clienteServicioAgentes(evento: H3Event): SupabaseClient {
  const config = useRuntimeConfig(evento)
  const url = String(config.public.supabaseUrl || ''), clave = String(config.supabaseServiceRoleKey || '')
  if (!url || !clave) throw errores.interno('La API de agentes no está configurada en el servidor.')
  return createClient(url, clave, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { fetch: (entrada, init) => fetch(entrada, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(25_000)]) : AbortSignal.timeout(25_000) }) }
  })
}

/** La persona dueña debe conservar, en cada llamada, los permisos con los que se creó la llave. */
export async function propietarioConPermisos(privado: SupabaseClient, propietarioId: string) {
  const roles = await privado.from('user_roles').select('role').eq('user_id', propietarioId).eq('is_active', true)
  if (roles.error) throw errores.interno()
  if (!roles.data?.length) return false
  const permisos = await privado.from('editorial_role_permissions').select('permission').in('role', roles.data.map(fila => fila.role))
  if (permisos.error) throw errores.interno()
  return ['panel.acceder', 'contenido.editarTodos'].every(permiso => permisos.data?.some(fila => fila.permission === permiso))
}

export async function autenticarAgente(evento: H3Event): Promise<ContextoAgente> {
  const cabecera = getHeader(evento, 'authorization') || ''
  const coincidencia = /^Bearer (p3l_[A-Za-z0-9_-]{43})$/.exec(cabecera)
  if (!coincidencia) throw errores.noAutenticado()
  const privado = clienteServicioAgentes(evento)
  const autenticacion = await privado.rpc('authenticate_social_agent_key', { p_hash: huellaLlave(coincidencia[1]!) })
  if (autenticacion.error) throw errores.interno()
  const datos = autenticacion.data as { id: string, name: string, owner_id: string, scopes: string[], max_schedules_per_day: number, rate_limit_per_minute: number } | null
  if (!datos) throw errores.noAutenticado()
  const tasa = await privado.rpc('take_social_agent_rate', { p_key: datos.id, p_limit: datos.rate_limit_per_minute })
  if (tasa.error) throw errores.interno()
  if (tasa.data !== true) throw errores.limite(`Superaste ${datos.rate_limit_per_minute} llamadas por minuto. Espera un momento y reintenta.`)
  if (!(await propietarioConPermisos(privado, datos.owner_id))) throw errores.propietario()
  return {
    privado,
    llave: { id: datos.id, nombre: datos.name, propietarioId: datos.owner_id, alcances: new Set(datos.scopes.filter((s): s is AlcanceAgente => (alcancesAgente as readonly string[]).includes(s))),
      maxProgramacionesDia: datos.max_schedules_per_day, limitePorMinuto: datos.rate_limit_per_minute },
    cabeceraIdempotencia: getHeader(evento, 'idempotency-key') || undefined
  }
}

export function exigirAlcance(contexto: ContextoAgente, alcance: AlcanceAgente) {
  if (!contexto.llave.alcances.has(alcance)) throw errores.alcance(alcance)
}

export async function auditarAgente(privado: SupabaseClient, llave: LlaveAgente, accion: string, entidadId: string, metadatos: Record<string, unknown> = {}) {
  await privado.from('editorial_audit_log').insert({ actor_id: llave.propietarioId, action: accion, entity_type: 'social_custom_post', entity_id: entidadId,
    metadata: { agentKeyId: llave.id, ...metadatos } })
}
