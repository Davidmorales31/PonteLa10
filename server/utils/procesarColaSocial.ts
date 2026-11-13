import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { obtenerArticuloEditorial } from './repositorioContenidoEditorial'
import { leerBorradorSocial } from './repositorioPublicacionesSociales'
import { crearDocumentoSocialPredeterminado } from '~/utils/editorial/publicacionesSociales'
import { ejecutarPublicacionMeta } from './ejecutarPublicacionMeta'
import type { ConfiguracionMeta } from './publicacionMeta'
import type { DestinoMeta, ResultadoPublicacionMeta } from '~/types/publicacionMeta'

const esquemaTrabajoSocial = z.object({ id: z.string().uuid(), claim_id: z.string().uuid(), actor_id: z.string().uuid(),
  article_id: z.string().uuid(), revision: z.number().int(), article_version: z.number().int(), document_hash: z.string().regex(/^[a-f0-9]{64}$/),
  image_hash: z.string().regex(/^[a-f0-9]{64}$/),
  destinations: z.array(z.enum(['facebook','instagram'])).min(1).max(2) })

/** Solo consume trabajos ya aprobados con MFA y auditados en la ruta de programación. */
export async function procesarColaSocial(cliente: SupabaseClient, configuracion: ConfiguracionMeta, sitio: string) {
  const reclamado = await cliente.rpc('claim_social_scheduled_publication')
  if (reclamado.error || !reclamado.data) return
  const lectura = esquemaTrabajoSocial.safeParse(reclamado.data)
  if (!lectura.success) return // Una reserva ilegible nunca se publica ni se recupera automáticamente.
  const trabajo = lectura.data
  const resultados: Partial<Record<DestinoMeta, ResultadoPublicacionMeta>> = {}
  let estado: 'published' | 'partial' | 'failed' | 'uncertain' = 'failed'
  let aviso = ''
  try {
    const roles = await cliente.from('user_roles').select('role').eq('user_id', trabajo.actor_id).eq('is_active', true)
    if (roles.error || !roles.data?.length) throw new Error('Permiso revocado')
    const permisos = await cliente.from('editorial_role_permissions').select('permission').in('role', roles.data.map(fila => fila.role))
    if (permisos.error || !['panel.acceder','contenido.editarTodos'].every(permiso => permisos.data?.some(fila => fila.permission === permiso))) throw new Error('Permiso revocado')
    const articulo = await obtenerArticuloEditorial(cliente, trabajo.article_id, trabajo.actor_id, { editarTodos: true, editarPropio: false })
    const urlCanonica = new URL(`/articulos/${articulo.slug}`, sitio).toString()
    const guardado = await leerBorradorSocial(cliente, trabajo.article_id)
    const documento = guardado.borrador?.documento || crearDocumentoSocialPredeterminado(articulo.titulo, articulo.portadaId,
      articulo.seo.textoSocial || articulo.resumen, urlCanonica, articulo.id)
    if (articulo.versionBloqueo !== trabajo.article_version || (guardado.borrador?.revision || 0) !== trabajo.revision
      || createHash('sha256').update(JSON.stringify(documento)).digest('hex') !== trabajo.document_hash) {
      aviso = 'La noticia o su composición cambió después de aprobar el lote. Revisa la vista previa y programa de nuevo.'
      throw new Error('Contenido modificado')
    }
    for (const destino of trabajo.destinations) {
      try {
        resultados[destino] = await ejecutarPublicacionMeta({ cliente, articulo, urlCanonica, contexto: { usuario: { id: trabajo.actor_id } } },
          { destino, revision: trabajo.revision, versionArticulo: trabajo.article_version }, cliente, configuracion, trabajo.image_hash)
      } catch (problema) { resultados[destino] = { estado: 'failed',
        aviso: String((problema as { statusMessage?: string })?.statusMessage || 'No se completó el envío. Revisa conexión, formato y recibos antes de reprogramar.').slice(0, 500) } }
    }
    const recibos = Object.values(resultados)
    estado = recibos.some(resultado => ['uncertain','in_progress'].includes(resultado.estado)) ? 'uncertain'
      : recibos.every(resultado => resultado.estado === 'published') ? 'published'
        : recibos.some(resultado => resultado.estado === 'published') ? 'partial' : 'failed'
  } catch { aviso ||= 'No se ejecutó el envío. Revisa los permisos actuales del responsable y la vigencia de la noticia.' }
  // Fallar guardando el estado no reenvía: la reserva caducada se marca incierta.
  await cliente.rpc('finish_social_scheduled_publication', { p_id: trabajo.id, p_claim_id: trabajo.claim_id,
    p_status: estado, p_result: { redes: resultados, aviso } })
}
