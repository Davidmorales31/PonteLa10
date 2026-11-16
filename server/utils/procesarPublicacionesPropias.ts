import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ejecutarPublicacionMetaPropia } from './ejecutarPublicacionMetaPropia'
import type { ConfiguracionMeta } from './publicacionMeta'

const esquemaTrabajo = z.object({ id: z.string().uuid(), revision: z.number().int(), destinations: z.array(z.enum(['facebook', 'instagram'])).min(1).max(2),
  actor_id: z.string().uuid().nullable(), created_by: z.string().uuid() })

/** Consume una publicación propia vencida por ciclo; solo existe si alguien con MFA la programó. */
export async function procesarPublicacionesPropiasProgramadas(cliente: SupabaseClient, configuracion: ConfiguracionMeta) {
  const reclamado = await cliente.rpc('claim_due_social_custom_post')
  if (reclamado.error || !reclamado.data) return
  const lectura = esquemaTrabajo.safeParse(reclamado.data)
  if (!lectura.success) return // Una reserva ilegible nunca se publica ni se recupera sola.
  const trabajo = lectura.data
  const actor = trabajo.actor_id || trabajo.created_by
  let estado: 'published' | 'failed'
  try {
    const roles = await cliente.from('user_roles').select('role').eq('user_id', actor).eq('is_active', true)
    if (roles.error || !roles.data?.length) throw new Error('Permiso revocado')
    const permisos = await cliente.from('editorial_role_permissions').select('permission').in('role', roles.data.map(fila => fila.role))
    if (permisos.error || !['panel.acceder', 'contenido.editarTodos'].every(permiso => permisos.data?.some(fila => fila.permission === permiso))) throw new Error('Permiso revocado')
    const resultados = []
    for (const destino of trabajo.destinations) {
      try {
        resultados.push(await ejecutarPublicacionMetaPropia({ cliente, privado: cliente, configuracion, actorId: actor, postId: trabajo.id },
          { destino, revision: trabajo.revision }))
      } catch { resultados.push({ estado: 'failed' as const }) }
    }
    // Un envío incierto o parcial queda para revisión humana: no se marca publicado.
    estado = resultados.every(resultado => resultado.estado === 'published') ? 'published' : 'failed'
  } catch { estado = 'failed' }
  // El SQL recalcula el estado final desde los recibos publicados (p. ej. si el botón manual ya publicó).
  const cierre = await cliente.rpc('finish_social_custom_post', { p_id: trabajo.id, p_status: estado })
  if (cierre.error) console.error('[social:propias] no se pudo cerrar el envío programado')
}
