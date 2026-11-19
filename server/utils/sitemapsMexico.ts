import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { construirIndiceSitemapPublico, construirUrlsetSitemapPublico, type EntradaSitemapPublico } from '~/server/utils/sitemapsPublicos'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'

/** Mapas que en México no tienen contenido propio (datos de Colombia): salen vacíos. */
export const mapasSinContenidoMexico = new Set([
  '/sitemap-matches.xml', '/sitemap-teams.xml', '/sitemap-competitions.xml', '/sitemap-rounds.xml', '/sitemap-players.xml'
])

export const paginasPublicasMexico = [
  '/', '/articulos', '/partidos-hoy', '/liga-mx', '/clubes', '/resultados', '/resultados/futbol', '/especiales',
  '/quienes-somos', '/politica-editorial', '/correcciones', '/autores/equipo-pont3la10', '/privacidad', '/terminos'
]

export const hubsMexico = [
  { ruta: '/futbol-mexicano', filtro: { categoria: 'futbol-mexicano' }, prioridad: '0.9' },
  { ruta: '/seleccion-mexicana', filtro: { tema: 'seleccion-mexicana' }, prioridad: '0.9' },
  { ruta: '/mexicanos-en-el-exterior', filtro: { tema: 'mexicanos-en-el-exterior' }, prioridad: '0.8' },
  { ruta: '/futbol-internacional', filtro: { categoria: 'futbol-mundial' }, prioridad: '0.8' }
] as const

const MAX_ARTICULOS = 5000
const TAMANO_PAGINA = 50

export interface DependenciasSitemapMexico {
  /** Artículos públicos de México, más recientes primero. */
  articulos(limite: number, desplazamiento: number): Promise<ResumenArticuloPublico[]>
  /** Primeras noticias de un hub de México. */
  noticiasHub(filtro: { categoria?: string, tema?: string }): Promise<ResumenArticuloPublico[]>
}

/**
 * XML del mapa pedido para el sitio de México, o `null` si esa ruta no la resuelve esta función
 * (el mapa de noticias lo genera su propia ruta).
 */
export async function construirSitemapMexico(ruta: string, origen: string, dep: DependenciasSitemapMexico): Promise<string | null> {
  if (mapasSinContenidoMexico.has(ruta)) return construirUrlsetSitemapPublico([], origen)

  if (ruta === '/sitemap-pages.xml') {
    return construirUrlsetSitemapPublico(paginasPublicasMexico.map(rutaPagina => ({ ruta: rutaPagina })), origen)
  }

  if (ruta === '/sitemap-articles.xml') {
    const entradas: EntradaSitemapPublico[] = []
    for (let desplazamiento = 0; desplazamiento < MAX_ARTICULOS; desplazamiento += TAMANO_PAGINA) {
      const pagina = await dep.articulos(TAMANO_PAGINA, desplazamiento)
      entradas.push(...pagina.map(articulo => ({
        ruta: `/articulos/${articulo.slug}`,
        modificadoEn: articulo.modificadoEn || articulo.publicadoEn,
        frecuencia: 'weekly' as const,
        prioridad: '0.8'
      })))
      if (pagina.length < TAMANO_PAGINA) break
    }
    return construirUrlsetSitemapPublico(entradas, origen)
  }

  if (ruta === '/sitemap-hubs.xml') {
    const entradas: EntradaSitemapPublico[] = []
    for (const hub of hubsMexico) {
      const noticias = await dep.noticiasHub(hub.filtro)
      if (!evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: noticias.length, fuenteDisponible: true })) continue
      entradas.push({ ruta: hub.ruta, modificadoEn: noticias[0]?.publicadoEn, frecuencia: 'daily', prioridad: hub.prioridad })
    }
    return construirUrlsetSitemapPublico(entradas, origen)
  }

  if (ruta === '/sitemap-index.xml' || ruta === '/sitemap.xml') {
    return construirIndiceSitemapPublico(
      ['/sitemap-pages.xml', '/sitemap-articles.xml', '/sitemap-hubs.xml', '/news-sitemap.xml'].map(rutaMapa => ({ ruta: rutaMapa })),
      origen
    )
  }

  return null
}
