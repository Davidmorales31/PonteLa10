import {
  prepararRespuestaSitemap,
  construirUrlsetSitemapPublico,
  registrarFalloSitemap
} from '~/server/utils/sitemapsPublicos'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarRutasIndexablesCompeticiones } from '~/server/utils/competicionesPublicas'

// La página de Liga Colombiana es la única ficha pública de competición vigente.
export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  try {
    const competiciones = await listarRutasIndexablesCompeticiones(obtenerClienteSupabaseAnonimo(evento))
    const entradas = [
      { ruta: '/liga-colombiana', frecuencia: 'daily' as const, prioridad: '0.9' },
      ...competiciones.map(comp => ({
        ruta: comp.ruta,
        modificadoEn: comp.actualizadaEn,
        frecuencia: 'daily' as const,
        prioridad: comp.esActual ? '0.85' : '0.6'
      }))
    ]
    prepararRespuestaSitemap(evento)
    return construirUrlsetSitemapPublico(entradas, urlSitio)
  } catch {
    registrarFalloSitemap(evento, 'competitions')
    return construirUrlsetSitemapPublico([], urlSitio)
  }
})
