import type { PartidoFutbolProveedor } from '~/types/futbolProveedor'
import { clasificarCategoriaFutbol } from '~/utils/clasificacionFutbol'

/** 4 = Colombia, 3 = torneos europeos clave, 2 = cinco ligas top, 0 = fuera del foco. */
export function prioridadCompetenciaFutbol(partido: PartidoFutbolProveedor): number {
  const categoria = clasificarCategoriaFutbol({
    competencia: partido.competencia.nombre,
    paisCompetencia: partido.competencia.pais,
    equipoLocal: partido.local.nombre,
    equipoVisitante: partido.visitante.nombre,
    paisEquipoLocal: partido.local.pais,
    paisEquipoVisitante: partido.visitante.pais
  })
  if (categoria === 'colombia') return 4
  if (categoria === 'europa') return 3
  if (categoria === 'cinco-grandes') return 2
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
