import { z } from 'zod'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import type { BandejaPublicacionesSociales } from '~/types/publicacionesSociales'

export default defineEventHandler(async (evento): Promise<BandejaPublicacionesSociales> => {
  await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  setHeader(evento, 'Cache-Control', 'private, no-store')
  const filtros = validarEntradaEditorial(z.object({
    buscar: z.string().max(100).default(''), pagina: z.coerce.number().int().min(1).max(10000).default(1)
  }), getQuery(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  let consulta = cliente.from('articles').select('id, title, slug, summary, published_at, categories(name), media_files!articles_cover_media_id_fkey(bucket,path,alt)', { count: 'exact' })
    .eq('status', 'published').order('published_at', { ascending: false })
  if (filtros.buscar) consulta = consulta.ilike('title', `%${filtros.buscar.replace(/[%_]/g, '\\$&')}%`)
  const { data, count, error } = await consulta.range((filtros.pagina - 1) * 20, filtros.pagina * 20 - 1)
  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudieron consultar las noticias publicadas.' })
  const ids = (data || []).map(actual => actual.id)
  const borradores = ids.length ? await cliente.from('social_compositions').select('article_id,status,revision,updated_at').in('article_id', ids) : { data: [], error: null }
  const faltaMigracion = borradores.error && ['42P01', 'PGRST205'].includes(borradores.error.code)
  if (borradores.error && !faltaMigracion) throw createError({ statusCode: 503, statusMessage: 'No se pudieron consultar los estados sociales.' })
  return { articulos: (data || []).map(actual => {
    const medio = Array.isArray(actual.media_files) ? actual.media_files[0] : actual.media_files
    const categoria = Array.isArray(actual.categories) ? actual.categories[0] : actual.categories
    const borrador = borradores.data?.find(b => b.article_id === actual.id)
    return { id: actual.id, titulo: actual.title, resumen: actual.summary, slug: actual.slug,
      publicadoEn: actual.published_at, categoria: categoria?.name || '', estado: borrador?.status || 'pending',
      actualizadoEn: borrador?.updated_at || null,
      portada: medio ? cliente.storage.from(medio.bucket).getPublicUrl(medio.path).data.publicUrl : null }
  }), total: count || 0, pagina: filtros.pagina, almacenamientoDisponible: !faltaMigracion }
})
