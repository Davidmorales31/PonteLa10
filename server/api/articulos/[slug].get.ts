import type { ArticuloPublicoEditorial } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloPublicoEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { listarEntidadesPublicasSeo, listarRelacionesPublicasSeo } from '~/server/utils/grafoEntidadesSeo'
import { listarPartidosSeoPublicos } from '~/server/utils/partidosSeoPublicos'
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
  const articulo = await obtenerArticuloPublicoEditorial(clienteSupabase, slug)

  if (!articulo) {
    setResponseHeader(evento, 'X-Robots-Tag', 'noindex, follow')
    throw createError({
      statusCode: 404,
      statusMessage: 'Publicación no encontrada.'
    })
  }

  articulo.relacionesEntidades = await listarRelacionesPublicasSeo(clienteSupabase, articulo.id)
  articulo.proximoPartidoEntidad = null

  if (articulo.relacionesEntidades.some(relacion => relacion.relacion === 'about')) {
    try {
      const [partidos, entidades] = await Promise.all([
        listarPartidosSeoPublicos(clienteSupabase),
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

  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  )

  return articulo
})
