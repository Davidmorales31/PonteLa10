import { claveEquipo } from '~/utils/claveEquipo'
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

export interface ClubLigaMx {
  clave: string
  nombre: string
  posicion: number | null
  puntos: number | null
  jugados: number | null
  fase: string | null
}

/**
 * Clubes de la Liga MX a partir de la tabla (con respaldo en los partidos): la fuente es el
 * proveedor, así que un club que sube, baja o cambia de nombre aparece sin tocar el código.
 */
export function clubesDeLigaMx(tabla: PosicionLigaMx[], partidos: PartidoLigaMx[], torneo: string | null): ClubLigaMx[] {
  const clubes = new Map<string, ClubLigaMx>()
  const fases = fasesDeTabla(tabla, 'liga-mx', torneo)
  for (const fila of filasDeTabla(tabla, 'liga-mx', fases[0] ?? null)) {
    clubes.set(fila.equipoClave, { clave: fila.equipoClave, nombre: fila.equipo, posicion: fila.posicion, puntos: fila.puntos, jugados: fila.jugados, fase: fila.fase })
  }
  for (const partido of partidos.filter(p => p.competencia === 'liga-mx')) {
    for (const nombre of [partido.local, partido.visitante]) {
      const clave = claveEquipo(nombre)
      if (clave && !clubes.has(clave)) clubes.set(clave, { clave, nombre, posicion: null, puntos: null, jugados: null, fase: null })
    }
  }
  return [...clubes.values()].sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99) || a.nombre.localeCompare(b.nombre, 'es'))
}

export function partidosDelClub(partidos: PartidoLigaMx[], clave: string): PartidoLigaMx[] {
  return partidos.filter(p => p.competencia === 'liga-mx' && (claveEquipo(p.local) === clave || claveEquipo(p.visitante) === clave))
}

/** Estadio donde más veces juega de local, según los partidos; null si el proveedor no lo informa. */
export function estadioDelClub(partidos: PartidoLigaMx[], clave: string): string | null {
  const conteo = new Map<string, number>()
  for (const partido of partidos) {
    if (claveEquipo(partido.local) !== clave || !partido.estadio) continue
    conteo.set(partido.estadio, (conteo.get(partido.estadio) || 0) + 1)
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}
