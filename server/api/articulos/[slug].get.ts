import type { ArticuloPublicoEditorial } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloPublicoEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { listarEntidadesPublicasSeo, listarRelacionesPublicasSeo } from '~/server/utils/grafoEntidadesSeo'
import {
  listarPartidosSeoPublicos,
  obtenerOpcionesLecturaSnapshotsPartidosSeo
} from '~/server/utils/partidosSeoPublicos'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import { listarClubesMexicoPublicos, relacionarClubesMexico } from '~/server/utils/relacionesClubesMexico'
import { extraerTextoDocumento } from '~/utils/editorial/documento'
import { sitioDeSolicitud } from '~/server/utils/sitioDeSolicitud'
import { seleccionarProximoPartidoArticuloSeo } from '~/utils/editorial/navegacionContextualSeo'

export default defineEventHandler(async (
  evento
): Promise<ArticuloPublicoEditorial> => {
  const slug = String(getRouterParam(evento, 'slug') || '')

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Publicación no encontrada.'
    })
  }

  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloPublicoEditorial(clienteSupabase, slug, sitioDeSolicitud(evento))

  if (!articulo) {
    setResponseHeader(evento, 'X-Robots-Tag', 'noindex, follow')
    throw createError({
      statusCode: 404,
      statusMessage: 'Publicación no encontrada.'
    })
  }

  articulo.relacionesEntidades = await listarRelacionesPublicasSeo(clienteSupabase, articulo.id)
  articulo.proximoPartidoEntidad = null

  // México no usa el grafo de entidades de Colombia: enlaza los clubes de la Liga MX que el texto nombra.
  if (sitioDeSolicitud(evento) === 'mx' && !articulo.relacionesEntidades.length) {
    try {
      const clubes = await listarClubesMexicoPublicos(clienteSupabase)
      articulo.relacionesEntidades = relacionarClubesMexico(
        [articulo.titulo, articulo.resumen, extraerTextoDocumento(articulo.documento)].join(' . '),
        clubes
      )
    } catch {
      // Los enlaces a clubes son complementarios.
    }
  }

  if (articulo.relacionesEntidades.some(relacion => relacion.relacion === 'about')) {
    try {
      const [partidos, entidades] = await Promise.all([
        listarPartidosSeoPublicos(
          clienteSupabase,
          obtenerOpcionesLecturaSnapshotsPartidosSeo(evento)
        ),
        listarEntidadesPublicasSeo(clienteSupabase)
      ])
      articulo.proximoPartidoEntidad = seleccionarProximoPartidoArticuloSeo(
        articulo.relacionesEntidades,
        partidos,
        entidades
      )
    } catch {
      // El enlace es complementario; una consulta fallida no interrumpe la lectura del artículo.
    }
  }

  aplicarCachePublica(evento, 'articulo')

  return articulo
})
