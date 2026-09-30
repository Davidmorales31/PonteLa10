import type { PartidoResultado } from '~/types/resultados'
import type {
  FilaMembresiaColombianoEuropa,
  JugadorColombianoEuropa,
  PartidoColombianoEuropa
} from '~/types/colombianosEuropa'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

const paisesEuropa = new Set([
  'AD', 'AL', 'AM', 'AT', 'AZ', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE',
  'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GE', 'GI', 'GR', 'HR', 'HU', 'IE',
  'IL', 'IS', 'IT', 'KZ', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT',
  'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'TR', 'UA',
  'VA', 'XK'
])

export function filtrarMembresiasEuropeasActivas(
  filas: readonly FilaMembresiaColombianoEuropa[],
  fecha: string
): JugadorColombianoEuropa[] {
  if (!esFechaCalendario(fecha)) return []

  const porJugador = new Map<string, JugadorColombianoEuropa | null>()

  for (const fila of filas) {
    const { jugador, membresia, equipo } = fila
    if (
      !jugador.publico || jugador.deporte !== 'futbol' || jugador.codigoPais !== 'CO'
      || !esNacionalidadVerificada(jugador.nacionalidadVerificadaEn)
      || !membresia.publico || !esMembresiaActiva(membresia.desde, membresia.hasta, fecha)
      || !equipo.publico || equipo.deporte !== 'futbol' || !paisesEuropa.has(equipo.codigoPais || '')
      || !jugador.slug.trim() || !jugador.nombre.trim() || !equipo.id.trim()
      || !equipo.slug.trim() || !equipo.nombre.trim()
    ) continue

    const existente = porJugador.get(jugador.slug)
    if (existente === undefined) {
      porJugador.set(jugador.slug, {
        slug: jugador.slug,
        nombre: jugador.nombre,
        equipoIdInterno: equipo.id,
        club: equipo.nombre
      })
    } else if (existente && existente.equipoIdInterno !== equipo.id) {
      // Dos clubes vigentes simultáneamente no permiten afirmar cuál es el actual.
      porJugador.set(jugador.slug, null)
    }
  }

  return [...porJugador.values()]
    .filter((jugador): jugador is JugadorColombianoEuropa => jugador !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CO'))
}

export function cruzarJugadoresConPartidos(
  jugadores: readonly JugadorColombianoEuropa[],
  partidos: readonly PartidoResultado[],
  fechaColombia: string
): PartidoColombianoEuropa[] {
  if (!esFechaCalendario(fechaColombia)) return []

  const cruces: PartidoColombianoEuropa[] = []
  for (const partido of partidos) {
    if (
      partido.deporte !== 'futbol'
      || !Number.isFinite(Date.parse(partido.fechaIso))
      || obtenerFechaEnZonaHoraria(new Date(partido.fechaIso), zonaHorariaColombia) !== fechaColombia
    ) continue

    for (const jugador of jugadores) {
      const clubLocal = partido.equipoLocal.idInterno === jugador.equipoIdInterno
      const clubVisitante = partido.equipoVisitante.idInterno === jugador.equipoIdInterno
      if (clubLocal === clubVisitante) continue

      const rival = clubLocal ? partido.equipoVisitante.nombre : partido.equipoLocal.nombre
      if (!rival.trim()) continue

      cruces.push({
        jugador,
        partido,
        rival,
        clubLocal,
        horaColombia: formatearHoraColombia(partido.fechaIso)
      })
    }
  }

  return cruces.sort((a, b) => Date.parse(a.partido.fechaIso) - Date.parse(b.partido.fechaIso))
}

export function formatearHoraColombia(fechaIso: string): string {
  const fecha = new Date(fechaIso)
  if (!Number.isFinite(fecha.getTime())) return 'Hora por confirmar'

  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: zonaHorariaColombia
  }).format(fecha)
}

export function formatearResultadoClubRival(partido: PartidoColombianoEuropa): string | undefined {
  const { marcadorLocal, marcadorVisitante } = partido.partido
  if (marcadorLocal == null || marcadorVisitante == null) return undefined

  const marcadorClub = partido.clubLocal ? marcadorLocal : marcadorVisitante
  const marcadorRival = partido.clubLocal ? marcadorVisitante : marcadorLocal
  return `${marcadorClub}–${marcadorRival}`
}

export function esFechaCalendario(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

function esMembresiaActiva(desde: string | null, hasta: string | null, fecha: string): boolean {
  // Sin fecha de inicio no se puede demostrar que la relación ya esté vigente.
  return Boolean(desde && esFechaCalendario(desde) && desde <= fecha)
    && (!hasta || (esFechaCalendario(hasta) && hasta >= fecha))
}

function esNacionalidadVerificada(verificadaEn: string | null): boolean {
  return Boolean(verificadaEn && Number.isFinite(Date.parse(verificadaEn)))
}
