import type { IdSitio } from '~/utils/sitio'

/**
 * Páginas que existen solo para un sitio. En el otro dominio responden 404, así no se
 * mezcla contenido (por ejemplo, la Liga colombiana en el dominio de México).
 * México solo muestra páginas con contenido propio: las de equipos, jugadores y
 * competiciones se habilitan cuando tengan datos de México (fases 4C y 5).
 */
export const rutasSoloColombia = [
  '/liga-colombiana', '/seleccion-colombia', '/colombianos-en-europa', '/futbol-colombiano',
  '/equipos', '/jugadores', '/competiciones', '/jornadas', '/partidos', '/como-quedo', '/donde-ver'
] as const

export const rutasSoloMexico = ['/liga-mx', '/futbol-mexicano', '/clubes', '/seleccion-mexicana', '/mexicanos-en-el-exterior'] as const

function coincide(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(`${base}/`)
}

/** `true` si la ruta no debe servirse en ese sitio. */
export function rutaNoDisponibleEnSitio(ruta: string, sitio: IdSitio): boolean {
  const limpia = ruta.replace(/\/+$/, '') || '/'
  const ajenas = sitio === 'mx' ? rutasSoloColombia : rutasSoloMexico
  return ajenas.some(base => coincide(limpia, base))
}
