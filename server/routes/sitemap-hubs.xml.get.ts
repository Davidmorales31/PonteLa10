import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { analizarConsultaArticulosPublicos } from '~/server/utils/filtrosArticulosPublicos'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import { contarContenidoSeleccionVerificado, obtenerFechaColombia } from '~/utils/seleccionColombia'
import { fechaVerificacionSeleccion } from '~/data/seleccionColombia2026'
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
  const entradas: EntradaSitemapPublico[] = []
  const entidadesSeleccionVerificadas = contarContenidoSeleccionVerificado(obtenerFechaColombia())

  if (evaluarIndexabilidad({
    tipo: 'hub',
    articulosDisponibles: 0,
    entidadesVerificadas: entidadesSeleccionVerificadas,
    fuenteDisponible: true
  })) {
    entradas.push({
      ruta: '/seleccion-colombia',
      modificadoEn: fechaVerificacionSeleccion,
      frecuencia: 'daily',
      prioridad: '0.9'
    })
  }

  try {
    const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)

    for (const hub of hubsEditoriales) {
      if (hub.ruta === '/seleccion-colombia') continue
      const consulta = analizarConsultaArticulosPublicos({ categoria: hub.categoria, limite: '3' })
      if (!consulta) continue

      const articulosHub = await listarArticulosPublicosEditoriales(clienteSupabase, 3, 0, consulta)
      if (!evaluarIndexabilidad({
        tipo: 'hub',
        articulosDisponibles: articulosHub.length,
        fuenteDisponible: true
      })) continue

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
    return construirUrlsetSitemapPublico(entradas, urlSitio)
  }
})
