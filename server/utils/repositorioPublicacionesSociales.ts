import type { SupabaseClient } from '@supabase/supabase-js'
import type { BorradorSocial } from '~/types/publicacionesSociales'
import { esquemaDocumentoSocial } from '~/utils/editorial/publicacionesSociales'
import type { DocumentoSocial } from '~/utils/editorial/publicacionesSociales'
import { obtenerMedioEditorial } from './repositorioMediaEditorial'

export async function leerBorradorSocial(cliente: SupabaseClient, articuloId: string) {
  const { data, error } = await cliente.from('social_compositions')
    .select('document, revision, status, updated_at').eq('article_id', articuloId).maybeSingle()
  if (error && ['42P01', 'PGRST205'].includes(error.code)) return { borrador: null, disponible: false }
  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudieron consultar los borradores sociales.' })
  if (!data) return { borrador: null, disponible: true }
  const documento = esquemaDocumentoSocial.safeParse(data.document)
  if (!documento.success) throw createError({ statusCode: 409, statusMessage: 'El borrador guardado tiene una versión incompatible. Conserva el contenido y solicita revisión.' })
  return { disponible: true, borrador: { documento: documento.data, revision: data.revision,
    estado: data.status, actualizadoEn: data.updated_at } as BorradorSocial }
}

export async function validarMediosSociales(cliente: SupabaseClient, documento: DocumentoSocial) {
  const ids = [...new Set(documento.diapositivas.flatMap(diapositiva => diapositiva.medioId ? [diapositiva.medioId] : []))]
  return Promise.all(ids.map(id => obtenerMedioEditorial(cliente, id)))
}

export async function guardarBorradorSocial(cliente: SupabaseClient, articuloId: string,
  documento: DocumentoSocial, revision: number, estado: 'draft' | 'ready'): Promise<BorradorSocial> {
  await validarMediosSociales(cliente, documento)
  const valores = { document: documento, status: estado }
  const consulta = revision === 0
    ? cliente.from('social_compositions').insert({ ...valores, article_id: articuloId })
    : cliente.from('social_compositions').update(valores).eq('article_id', articuloId).eq('revision', revision)
  const { data, error } = await consulta.select('revision, updated_at').maybeSingle()
  if (error?.code === '23505' || (!error && !data)) throw createError({ statusCode: 409,
    statusMessage: 'Otra sesión guardó esta publicación. Conserva tus cambios y recarga antes de continuar.' })
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar. Comprueba que la migración social esté instalada; tus cambios siguen en el editor.' })
  return { documento, revision: data.revision, estado, actualizadoEn: data.updated_at }
}
