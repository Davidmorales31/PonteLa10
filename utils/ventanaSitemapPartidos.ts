const MS_POR_DIA = 24 * 60 * 60 * 1000

export const diasPasadosSitemapPartidos = 45
export const diasFuturosSitemapPartidos = 21

/**
 * El sitemap descubre contenido vigente: partidos recientes o próximos. Los
 * partidos antiguos siguen siendo accesibles e indexables por enlaces internos,
 * pero dejan de anunciarse para que el rastreo se concentre en lo que aporta.
 */
export function partidoEnVentanaSitemap(fechaIso: string, ahora = Date.now()): boolean {
  const fecha = Date.parse(fechaIso)
  if (!Number.isFinite(fecha)) return false
  return fecha >= ahora - diasPasadosSitemapPartidos * MS_POR_DIA
    && fecha <= ahora + diasFuturosSitemapPartidos * MS_POR_DIA
}
