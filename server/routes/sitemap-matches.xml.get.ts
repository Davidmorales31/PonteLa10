import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import {
  listarPartidosSeoPublicos,
  listarSlugsConTransmisionVerificada
} from '~/server/utils/partidosSeoPublicos'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import {
  construirUrlsetSitemapPublico,
  type EntradaSitemapPublico,
  prepararRespuestaSitemap,
  registrarFalloSitemap
} from '~/server/utils/sitemapsPublicos'

export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)

  try {
    const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)
    const partidos = await listarPartidosSeoPublicos(clienteSupabase)
    const partidosConTransmisionVerificada = await listarSlugsConTransmisionVerificada(clienteSupabase)
    const entradas: EntradaSitemapPublico[] = partidos.flatMap((partido) => {
      if (!evaluarIndexabilidad({
        ...partido,
        transmisionVerificada: partidosConTransmisionVerificada.has(partido.slug)
      })) return []

      return [{
        ruta: `/partidos/${partido.slug}`,
        modificadoEn: partido.verificadoEn,
        frecuencia: 'daily' as const,
        prioridad: '0.8'
      }]
    })

    prepararRespuestaSitemap(evento)
    return construirUrlsetSitemapPublico(entradas, urlSitio)
  } catch {
    registrarFalloSitemap(evento, 'matches')
    return construirUrlsetSitemapPublico([], urlSitio)
  }
})
