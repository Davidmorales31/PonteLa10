import { getRouterParam } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerPartidoSeoPublico, listarPartidosSeoPublicos } from '~/server/utils/partidosSeoPublicos'
import { listarEntidadesPublicasSeo } from '~/server/utils/grafoEntidadesSeo'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import { obtenerTipoCachePartido } from '~/utils/cachePublica'
import { construirNavegacionContextualPartidoSeo } from '~/utils/editorial/navegacionContextualSeo'
import type { NavegacionContextualPartidoSeo } from '~/types/navegacionContextualSeo'

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (slug.length > 240 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'La dirección del partido no es válida.' })
  }

  const cliente = obtenerClienteSupabaseAnonimo(evento)
  const partido = await obtenerPartidoSeoPublico(cliente, slug)
  let navegacion: NavegacionContextualPartidoSeo | null = null

  try {
    const [partidos, entidades] = await Promise.all([
      listarPartidosSeoPublicos(cliente),
      listarEntidadesPublicasSeo(cliente)
    ])
    navegacion = construirNavegacionContextualPartidoSeo(partido, partidos, entidades)
  } catch {
    // La ficha verificada sigue disponible si falla la ampliación de navegación contextual.
  }

  aplicarCachePublica(evento, obtenerTipoCachePartido(partido.estado))
  return { partido, navegacion }
})
