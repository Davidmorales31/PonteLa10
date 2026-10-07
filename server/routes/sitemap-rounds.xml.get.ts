import {
  prepararRespuestaSitemap,
  construirUrlsetSitemapPublico,
  registrarFalloSitemap
} from '~/server/utils/sitemapsPublicos'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarRutasIndexablesJornadas } from '~/server/utils/competicionesPublicas'

export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  try {
    const jornadas = await listarRutasIndexablesJornadas(obtenerClienteSupabaseAnonimo(evento))
    const entradas = jornadas.map(jornada => ({
      ruta: jornada.ruta,
      modificadoEn: jornada.actualizadaEn,
      frecuencia: 'weekly' as const,
      prioridad: '0.65'
    }))
    prepararRespuestaSitemap(evento)
    return construirUrlsetSitemapPublico(entradas, urlSitio)
  } catch {
    registrarFalloSitemap(evento, 'rounds')
    return construirUrlsetSitemapPublico([], urlSitio)
  }
})
