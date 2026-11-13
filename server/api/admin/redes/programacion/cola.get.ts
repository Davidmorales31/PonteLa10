import { contextoOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import type { ColaProgramacionSocial } from '~/types/programacionSocial'
import { z } from 'zod'
const esquemaReciboCola = z.object({ estado: z.enum(['published','in_progress','uncertain','failed']),
  url: z.string().regex(/^https:\/\/www\.(facebook\.com\/[0-9_]+|instagram\.com\/(p\/[A-Za-z0-9_-]+\/|pont3ladiez\/))$/).optional(),
  aviso: z.string().max(1000).optional(), yaPublicado: z.boolean().optional() })
const esquemaResultadoCola = z.object({ aviso: z.string().max(1000).optional(), redes: z.object({ facebook: esquemaReciboCola.optional(), instagram: esquemaReciboCola.optional() }).optional() })

export default defineEventHandler(async (evento): Promise<ColaProgramacionSocial> => {
  const { contexto } = await contextoOAuthSocial(evento)
  const privado = clienteOAuthSocial(evento)
  const [latido, lotes] = await Promise.all([
    privado.from('social_scheduler_state').select('last_seen_at').eq('id', true).maybeSingle(),
    privado.from('social_schedule_batches').select('id,starts_at,interval_minutes,created_at')
      .eq('actor_id', contexto.usuario.id).order('created_at', { ascending: false }).limit(10)
  ])
  if (latido.error || lotes.error) throw createError({ statusCode: 503, statusMessage: 'No se pudo consultar la programación social.' })
  const ids = (lotes.data || []).map(lote => lote.id)
  const trabajos = ids.length ? await privado.from('social_scheduled_publications')
    .select('id,batch_id,article_id,position,run_at,status,destinations,result,articles(title)')
    .in('batch_id', ids).order('run_at').limit(500) : { data: [], error: null }
  if (trabajos.error) throw createError({ statusCode: 503, statusMessage: 'No se pudieron consultar los envíos programados.' })
  return { activo: Boolean(latido.data && Date.parse(latido.data.last_seen_at) > Date.now() - 90_000),
    ultimoLatido: latido.data?.last_seen_at || null, lotes: lotes.data || [], trabajos: (trabajos.data || []).map(trabajo => ({
      id: trabajo.id, loteId: trabajo.batch_id, articuloId: trabajo.article_id, posicion: trabajo.position,
      fecha: trabajo.run_at, estado: trabajo.status, destinos: trabajo.destinations,
      titulo: (Array.isArray(trabajo.articles) ? trabajo.articles[0] : trabajo.articles)?.title || 'Noticia', resultado: esquemaResultadoCola.safeParse(trabajo.result).data || null
    })) }
})
