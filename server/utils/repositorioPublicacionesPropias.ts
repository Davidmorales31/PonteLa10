import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { z } from 'zod'
import { obtenerMedioEditorial } from './repositorioMediaEditorial'
import { esquemaDocumentoPropio } from '~/utils/editorial/publicacionesPropias'
import type { DocumentoPropio } from '~/utils/editorial/publicacionesPropias'
import type { MedioEditorial } from '~/types/mediaEditorial'

export type EstadoPublicacionPropia = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
export type DestinoPropio = 'facebook' | 'instagram'
export interface ResumenPublicacionPropia {
  id: string, titulo: string, estado: EstadoPublicacionPropia, destinos: DestinoPropio[],
  programadaPara: string | null, revision: number, actualizadaEn: string
}
export interface PublicacionPropia extends ResumenPublicacionPropia {
  documento: DocumentoPropio
}

const esquemaFila = z.object({
  id: z.string().uuid(), title: z.string(), document: z.unknown(), status: z.enum(['draft', 'scheduled', 'publishing', 'published', 'failed']),
  destinations: z.array(z.enum(['facebook', 'instagram'])), scheduled_at: z.string().nullable(), revision: z.number().int(), updated_at: z.string()
})
const columnas = 'id,title,document,status,destinations,scheduled_at,revision,updated_at'

function resumir(fila: z.infer<typeof esquemaFila>): ResumenPublicacionPropia {
  return { id: fila.id, titulo: fila.title, estado: fila.status, destinos: fila.destinations, programadaPara: fila.scheduled_at,
    revision: fila.revision, actualizadaEn: fila.updated_at }
}
function falla(mensaje: string, codigo = 503): never {
  throw createError({ statusCode: codigo, statusMessage: mensaje })
}

export async function listarPublicacionesPropias(privado: SupabaseClient, limite = 20): Promise<ResumenPublicacionPropia[]> {
  const { data, error } = await privado.from('social_custom_posts').select(columnas).order('created_at', { ascending: false }).limit(limite)
  if (error) falla('No se pudieron consultar las publicaciones propias.')
  return (data || []).flatMap((fila) => { const lectura = esquemaFila.safeParse(fila); return lectura.success ? [resumir(lectura.data)] : [] })
}

export async function leerPublicacionPropia(privado: SupabaseClient, id: string): Promise<PublicacionPropia> {
  const { data, error } = await privado.from('social_custom_posts').select(columnas).eq('id', id).maybeSingle()
  if (error) falla('No se pudo consultar la publicación.')
  if (!data) falla('La publicación no existe.', 404)
  const fila = esquemaFila.parse(data)
  const documento = esquemaDocumentoPropio.safeParse(fila.document)
  if (!documento.success) falla('La publicación guardada tiene una versión incompatible.', 409)
  return { ...resumir(fila), documento: documento.data }
}

/** Todas las imágenes deben existir en la biblioteca y ser imágenes públicas del propio sitio. */
export async function validarMediosPropios(cliente: SupabaseClient, documento: DocumentoPropio): Promise<MedioEditorial[]> {
  const ids = [...new Set(documento.diapositivas.flatMap(diapositiva => diapositiva.medios.flatMap(medio => medio.medioId ? [medio.medioId] : [])))]
  const medios = await Promise.all(ids.map(id => obtenerMedioEditorial(cliente, id)))
  if (medios.some(medio => medio.bucket !== 'editorial-media')) falla('Una imagen no es compatible con las redes.', 422)
  return medios
}

export async function crearPublicacionPropia(privado: SupabaseClient, actorId: string, titulo: string, documento: DocumentoPropio): Promise<PublicacionPropia> {
  const { data, error } = await privado.from('social_custom_posts')
    .insert({ title: titulo, document: documento, created_by: actorId, updated_by: actorId }).select(columnas).single()
  if (error || !data) falla('No se pudo crear la publicación.')
  return { ...resumir(esquemaFila.parse(data)), documento }
}

export async function guardarPublicacionPropia(privado: SupabaseClient, id: string, actorId: string,
  entrada: { titulo: string, documento: DocumentoPropio, destinos: DestinoPropio[], revision: number }): Promise<PublicacionPropia> {
  // Editar una pieza programada la devuelve a borrador (y queda auditado): debe revisarse y programarse otra vez.
  const { data, error } = await privado.rpc('save_social_custom_post', { p_actor_id: actorId, p_id: id, p_title: entrada.titulo,
    p_document: entrada.documento, p_destinations: entrada.destinos, p_revision: entrada.revision })
  if (error) falla('No se pudo guardar la publicación.')
  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) falla('Otra sesión cambió esta publicación o ya fue publicada. Recarga antes de continuar.', 409)
  return { ...resumir(esquemaFila.parse(fila)), documento: entrada.documento }
}

export async function programarPublicacionPropia(privado: SupabaseClient, id: string, actorId: string, fecha: string, revision: number) {
  const { data, error } = await privado.rpc('schedule_social_custom_post', { p_actor_id: actorId, p_id: id, p_revision: revision, p_at: fecha })
  if (error) falla('No se pudo programar la publicación.')
  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) falla('La publicación cambió o ya no es un borrador. Recarga antes de programar.', 409)
  return resumir(esquemaFila.parse(fila))
}

export async function cancelarProgramacionPropia(privado: SupabaseClient, id: string, actorId: string) {
  const { data, error } = await privado.rpc('cancel_social_custom_schedule', { p_actor_id: actorId, p_id: id })
  if (error) falla('No se pudo cancelar la programación.')
  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) falla('La publicación no está programada.', 409)
  return resumir(esquemaFila.parse(fila))
}

export async function leerRecibosPublicacionPropia(privado: SupabaseClient, id: string) {
  const { data, error } = await privado.from('social_custom_publications').select('destination,status,post_url,updated_at').eq('post_id', id)
  if (error) falla('No se pudo verificar el historial de envíos.')
  const prioridad: Record<string, number> = { published: 3, uncertain: 2, preparing: 1, sending: 1, failed: 0 }
  const recibos: Partial<Record<DestinoPropio, { estado: string, url?: string }>> = {}
  for (const fila of data || []) {
    const destino = fila.destination as DestinoPropio
    const actual = recibos[destino]
    if (!actual || (prioridad[fila.status] ?? 0) > (prioridad[actual.estado] ?? 0)) {
      recibos[destino] = { estado: fila.status, ...(fila.status === 'published' && fila.post_url ? { url: fila.post_url } : {}) }
    }
  }
  return recibos
}
