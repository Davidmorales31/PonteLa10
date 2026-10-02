import type { PartidoFutbolProveedor } from '~/types/futbolProveedor'

const ligasTopCinco: Record<string, string[]> = {
  england: ['premier league'],
  spain: ['la liga', 'laliga', 'primera division'],
  italy: ['serie a'],
  germany: ['bundesliga'],
  france: ['ligue 1']
}
const competicionesEuropeasClave = [
  'uefa champions league', 'champions league', 'uefa europa league', 'europa league',
  'uefa conference league', 'conference league', 'uefa nations league', 'nations league',
  'european championship', 'uefa european championship', 'euro cup', 'uefa super cup'
]

/** 3 = Colombia, 2 = cinco ligas top, 1 = torneos europeos clave, 0 = fuera del foco. */
export function prioridadCompetenciaFutbol(partido: PartidoFutbolProveedor): number {
  const pais = normalizar(partido.competencia.pais || '')
  const nombre = normalizar(partido.competencia.nombre)

  if (pais.includes('colombia') || /\b(liga betplay|copa colombia|superliga colombiana)\b/.test(nombre)) return 3
  if (ligasTopCinco[pais]?.some(liga => nombre.includes(liga))) return 2
  if (competicionesEuropeasClave.some(competencia => nombre.includes(competencia))) return 1
  return 0
}

/** Filtra por prioridad y por el día civil de Bogotá, no por el día UTC del proveedor. */
export function filtrarFixturesPrioritariosDelDia(
  partidos: PartidoFutbolProveedor[],
  fechaBogota: string
): PartidoFutbolProveedor[] {
  const inicio = new Date(`${fechaBogota}T00:00:00-05:00`).getTime()
  if (!Number.isFinite(inicio)) throw new Error('La fecha de fixtures de fútbol no es válida.')
  const fin = inicio + 24 * 60 * 60 * 1000
  return partidos.filter((partido) => {
    const inicioUtc = Date.parse(partido.inicioUtc)
    return prioridadCompetenciaFutbol(partido) > 0
      && Number.isFinite(inicioUtc)
      && inicioUtc >= inicio
      && inicioUtc < fin
  })
}

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
