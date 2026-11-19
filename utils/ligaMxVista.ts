import type { PartidoLigaMx, PosicionLigaMx } from '~/types/ligaMx'

const estadosFinalizados = new Set(['finished'])
const estadosEnJuego = new Set(['live', 'halftime'])

export function estaFinalizado(partido: PartidoLigaMx): boolean {
  return estadosFinalizados.has(partido.estado)
}

export function estaEnJuego(partido: PartidoLigaMx): boolean {
  return estadosEnJuego.has(partido.estado)
}

/**
 * Torneo (Apertura o Clausura) que se está jugando: el del partido más cercano a hoy.
 * Sin partidos, el de la tabla más reciente.
 */
export function torneoActual(partidos: PartidoLigaMx[], tabla: PosicionLigaMx[], ahora: number): string | null {
  const cercano = [...partidos].sort((a, b) =>
    Math.abs(Date.parse(a.fechaIso) - ahora) - Math.abs(Date.parse(b.fechaIso) - ahora))[0]
  if (cercano) return cercano.torneo
  return tabla.find(fila => /apertura|clausura/i.test(fila.fase))?.fase ?? null
}

/** Fases con tabla para una liga, con el torneo actual primero y sin la fase genérica "Current" si hay otra. */
export function fasesDeTabla(tabla: PosicionLigaMx[], competencia: string, torneo: string | null): string[] {
  const fases = [...new Set(tabla.filter(fila => fila.competencia === competencia).map(fila => fila.fase))]
  const utiles = fases.filter(fase => !/^current$/i.test(fase))
  const lista = utiles.length ? utiles : fases
  return lista.sort((a, b) => Number(b === torneo) - Number(a === torneo) || a.localeCompare(b))
}

export function filasDeTabla(tabla: PosicionLigaMx[], competencia: string, fase: string | null): PosicionLigaMx[] {
  return tabla
    .filter(fila => fila.competencia === competencia && (fase === null || fila.fase === fase))
    .sort((a, b) => a.posicion - b.posicion)
}

export interface GrupoJornada {
  jornada: string
  partidos: PartidoLigaMx[]
}

/** Agrupa por jornada conservando el orden cronológico de la primera aparición. */
export function agruparPorJornada(partidos: PartidoLigaMx[]): GrupoJornada[] {
  const grupos = new Map<string, PartidoLigaMx[]>()
  for (const partido of [...partidos].sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))) {
    const clave = `${partido.torneo}|${partido.jornada}`
    grupos.set(clave, [...(grupos.get(clave) || []), partido])
  }
  return [...grupos.entries()].map(([clave, lista]) => ({ jornada: clave.split('|').slice(1).join('|'), partidos: lista }))
}

/** Próximos partidos sin terminar (incluye los que están en juego) y últimos resultados. */
export function proximosYRecientes(partidos: PartidoLigaMx[], ahora: number, limite = 6) {
  const ordenados = [...partidos].sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))
  const proximos = ordenados.filter(partido => !estaFinalizado(partido)
    && !['postponed', 'cancelled', 'abandoned', 'suspended'].includes(partido.estado)
    && (estaEnJuego(partido) || Date.parse(partido.fechaIso) >= ahora - 3 * 60 * 60 * 1000)).slice(0, limite)
  const recientes = ordenados.filter(estaFinalizado).slice(-limite).reverse()
  return { proximos, recientes }
}

export function marcador(partido: PartidoLigaMx): string {
  if (partido.golesLocal === null || partido.golesVisitante === null) return 'vs'
  return `${partido.golesLocal} – ${partido.golesVisitante}`
}
