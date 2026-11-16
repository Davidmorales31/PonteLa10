import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import type { EstadoPublicacionesSociales, ReciboPublicacionSocial } from '~/types/publicacionesSociales'

const prioridad = { failed: 0, in_progress: 1, uncertain: 2, published: 3 } as const

export function resumirRecibosSociales(filas: Array<{ article_id: string, destination: 'facebook' | 'instagram' | 'x', status: string, post_url: string | null }>) {
  const resultado: Record<string, EstadoPublicacionesSociales> = {}
  for (const fila of filas) {
    const estado: ReciboPublicacionSocial['estado'] = fila.status === 'published' ? 'published'
      : fila.status === 'uncertain' ? 'uncertain' : fila.status === 'failed' ? 'failed' : 'in_progress'
    const actual = (resultado[fila.article_id] ||= {})[fila.destination]
    if (!actual || prioridad[estado] > prioridad[actual.estado]) {
      resultado[fila.article_id]![fila.destination] = { estado,
        ...(estado === 'published' ? { yaPublicado: true, ...(fila.post_url ? { url: fila.post_url } : {}) } : {}) }
    }
  }
  return resultado
}

// Solo se llama con el cliente privado después de autorizar la lectura editorial.
// Nunca se exponen IDs internos de intentos, tokens ni huellas.
export async function leerEstadosPublicacionesSociales(privado: SupabaseClient, ids: string[]): Promise<Record<string, EstadoPublicacionesSociales>> {
  if (!ids.length) return {}
  const [meta, x] = await Promise.all([
    privado.from('social_meta_publications').select('article_id,destination,status,post_url').in('article_id', ids),
    privado.from('social_x_publications').select('article_id,status,post_url').in('article_id', ids)
  ])
  if (meta.error || x.error) throw createError({ statusCode: 503,
    statusMessage: 'No se pudo verificar el historial de publicaciones. No vuelvas a enviar hasta poder comprobarlo.' })
  return resumirRecibosSociales([...(meta.data || []), ...(x.data || []).map(fila => ({ ...fila, destination: 'x' as const }))])
}

/** Noticias anteriores a este momento (21:00 del 2026-11-15, Bogotá) no entran a la bandeja social. */
export const corteBandejaSocial = '2026-11-16T02:00:00.000Z'

export function articulosPublicadosEnAmbasRedes(filas: Array<{ article_id: string, destination: string, status: string }>): string[] {
  const porArticulo = new Map<string, Set<string>>()
  for (const fila of filas) {
    if (fila.status !== 'published' || !/^[0-9a-f-]{36}$/i.test(fila.article_id)) continue
    const destinos = porArticulo.get(fila.article_id) || new Set<string>()
    destinos.add(fila.destination)
    porArticulo.set(fila.article_id, destinos)
  }
  return [...porArticulo].filter(([, destinos]) => destinos.has('facebook') && destinos.has('instagram')).map(([id]) => id)
}

export async function leerArticulosPublicadosEnMeta(privado: SupabaseClient): Promise<string[]> {
  const { data, error } = await privado.from('social_meta_publications').select('article_id,destination,status')
    .eq('status', 'published').gte('created_at', corteBandejaSocial).limit(5000)
  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudo verificar el historial de publicaciones.' })
  return articulosPublicadosEnAmbasRedes(data || [])
}
