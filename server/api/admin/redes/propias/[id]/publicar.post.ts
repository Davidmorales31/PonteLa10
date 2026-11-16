import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { ejecutarPublicacionMetaPropia } from '~/server/utils/ejecutarPublicacionMetaPropia'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaPublicarPublicacionPropia } from '~/utils/editorial/publicacionesPropias'

export default defineEventHandler(async (evento) => {
  const { contexto, cliente, privado } = await contextoPublicacionPropia(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  const entrada = esquemaPublicarPublicacionPropia.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'Confirma el destino y la revisión desde el editor.' })
  const resultado = await ejecutarPublicacionMetaPropia({ cliente, privado, configuracion: useRuntimeConfig(evento),
    actorId: contexto.usuario.id, postId: id }, { destino: entrada.data.destino, revision: entrada.data.revision })
  if (resultado.estado === 'published') {
    // La pieza queda publicada cuando todos sus destinos tienen recibo publicado.
    const recibos = await privado.from('social_custom_publications').select('destination').eq('post_id', id).eq('status', 'published')
    const destinos = await privado.from('social_custom_posts').select('destinations').eq('id', id).maybeSingle()
    const publicados = new Set((recibos.data || []).map(fila => fila.destination))
    if (destinos.data?.destinations?.every((destino: string) => publicados.has(destino))) {
      await privado.from('social_custom_posts').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', id).in('status', ['draft', 'failed', 'scheduled'])
    }
  }
  return resultado
})
