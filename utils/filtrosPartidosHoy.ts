import type {
  DeporteResultado,
  EquipoResultado,
  EstadoPartido,
  PartidoResultado
} from '~/types/resultados'

export interface FiltrosPartidosHoy {
  deporte: DeporteResultado | ''
  competencia: string
  equipo: string
  estado: EstadoPartido | ''
  soloDestacados: boolean
}

export interface OpcionFiltroPartidosHoy {
  valor: string
  etiqueta: string
}

export function filtrarPartidosHoy(
  partidos: readonly PartidoResultado[],
  filtros: FiltrosPartidosHoy
): PartidoResultado[] {
  return partidos.filter(partido => (
    (!filtros.deporte || partido.deporte === filtros.deporte)
    && (!filtros.competencia || obtenerClaveCompetenciaFiltro(partido) === filtros.competencia)
    && (!filtros.equipo || [partido.equipoLocal, partido.equipoVisitante]
      .some(equipo => obtenerClaveEquipoFiltro(equipo) === filtros.equipo))
    && (!filtros.estado || partido.estado === filtros.estado)
    && (!filtros.soloDestacados || partido.destacado === true)
  ))
}

export function obtenerOpcionesCompetenciaFiltro(
  partidos: readonly PartidoResultado[]
): OpcionFiltroPartidosHoy[] {
  const opciones = new Map<string, string>()
  for (const partido of partidos) {
    const valor = obtenerClaveCompetenciaFiltro(partido)
    if (!opciones.has(valor)) opciones.set(valor, partido.competencia.trim())
  }

  return [...opciones]
    .map(([valor, etiqueta]) => ({ valor, etiqueta }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es-CO'))
}

export function obtenerOpcionesEquipoFiltro(
  partidos: readonly PartidoResultado[]
): OpcionFiltroPartidosHoy[] {
  const opciones = new Map<string, string>()
  for (const partido of partidos) {
    for (const equipo of [partido.equipoLocal, partido.equipoVisitante]) {
      const etiqueta = equipo.nombre.trim()
      const valor = obtenerClaveEquipoFiltro(equipo)
      if (etiqueta && !opciones.has(valor)) opciones.set(valor, etiqueta)
    }
  }

  return [...opciones]
    .map(([valor, etiqueta]) => ({ valor, etiqueta }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es-CO'))
}

export function obtenerClaveCompetenciaFiltro(partido: PartidoResultado): string {
  if (partido.competenciaIdInterno) return `id:${partido.competenciaIdInterno}`
  return `nombre:${normalizarEtiqueta(partido.competencia)}`
}

export function obtenerClaveEquipoFiltro(equipo: EquipoResultado): string {
  if (equipo.idInterno) return `id:${equipo.idInterno}`
  return `externo:${normalizarEtiqueta(equipo.nombre)}:${equipo.id}`
}

function normalizarEtiqueta(valor: string): string {
  return valor.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-CO')
}
