import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarEquiposLigaPublicos } from '~/server/utils/equiposLigaPublicos'
import { listarPartidosSeoPublicos, normalizarClaveEquipoLiga } from '~/server/utils/partidosSeoPublicos'
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
    const cliente = obtenerClienteSupabaseAnonimo(evento)
    const [equipos, partidos] = await Promise.all([
      listarEquiposLigaPublicos(cliente),
      listarPartidosSeoPublicos(cliente)
    ])
    const entradas: EntradaSitemapPublico[] = equipos.flatMap((equipo) => {
      const clasificacion = equipo.clasificaciones[0]
      const partidosPublicos = partidos.filter(partido =>
        normalizarClaveEquipoLiga(partido.local) === normalizarClaveEquipoLiga(equipo.nombre)
        || normalizarClaveEquipoLiga(partido.visitante) === normalizarClaveEquipoLiga(equipo.nombre)
      ).length
      const indexable = evaluarIndexabilidad({
        tipo: 'equipo',
        slug: equipo.slug,
        nombre: equipo.nombre,
        competencia: clasificacion?.competencia || '',
        temporada: clasificacion?.temporada || '',
        escudo: equipo.escudo,
        posicionVerificadaEn: clasificacion?.verificadoEn || null,
        partidosPublicos
      })

      return indexable
        ? [{ ruta: `/equipos/${equipo.slug}`, modificadoEn: equipo.actualizadoEn, frecuencia: 'daily' as const, prioridad: '0.7' }]
        : []
    })

    prepararRespuestaSitemap(evento)
    return construirUrlsetSitemapPublico(entradas, urlSitio)
  } catch {
    registrarFalloSitemap(evento, 'teams')
    return construirUrlsetSitemapPublico([], urlSitio)
  }
})
