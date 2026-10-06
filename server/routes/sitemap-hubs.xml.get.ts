import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { analizarConsultaArticulosPublicos } from '~/server/utils/filtrosArticulosPublicos'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import {
  construirUrlsetSitemapPublico,
  type EntradaSitemapPublico,
  prepararRespuestaSitemap,
  registrarFalloSitemap
} from '~/server/utils/sitemapsPublicos'

const hubsEditoriales = [
  { ruta: '/futbol-colombiano', categoria: 'futbol-colombiano', prioridad: '0.9' },
  { ruta: '/seleccion-colombia', categoria: 'colombia', prioridad: '0.9' },
  { ruta: '/futbol-internacional', categoria: 'futbol-mundial', prioridad: '0.8' },
  { ruta: '/colombianos-en-europa', categoria: 'colombianos-en-europa', prioridad: '0.8' }
]

export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)

  try {
    const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)
    const entradas: EntradaSitemapPublico[] = []

    for (const hub of hubsEditoriales) {
      const consulta = analizarConsultaArticulosPublicos({ categoria: hub.categoria, limite: '3' })
      if (!consulta) continue

      const articulosHub = await listarArticulosPublicosEditoriales(clienteSupabase, 3, 0, consulta)
      if (!evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: articulosHub.length, fuenteDisponible: true })) continue

      entradas.push({
        ruta: hub.ruta,
        modificadoEn: articulosHub[0]?.publicadoEn,
        frecuencia: 'daily' as const,
        prioridad: hub.prioridad
      })
    }

    prepararRespuestaSitemap(evento)
    return construirUrlsetSitemapPublico(entradas, urlSitio)
  } catch {
    registrarFalloSitemap(evento, 'hubs')
    return construirUrlsetSitemapPublico([], urlSitio)
  }
})
