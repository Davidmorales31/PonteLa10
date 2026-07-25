import type { RegistroAuditoriaEditorial } from '~/types/editorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'

interface FilaAuditoria {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export default defineEventHandler(async (evento): Promise<RegistroAuditoriaEditorial[]> => {
  await exigirPermisoEditorial(evento, 'auditoria.ver', { exigirMfa: true })
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  const { data, error } = await clienteSupabase
    .from('editorial_audit_log')
    .select('id, actor_id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo cargar la auditoría.'
    })
  }

  return (data || []).map((fila) => {
    const registro = fila as FilaAuditoria

    return {
      id: registro.id,
      accion: registro.action,
      tipoEntidad: registro.entity_type,
      entidadId: registro.entity_id,
      actorId: registro.actor_id,
      metadatos: registro.metadata || {},
      creadoEn: registro.created_at
    }
  })
})
