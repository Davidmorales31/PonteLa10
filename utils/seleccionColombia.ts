import type { PartidoResultado } from '~/types/resultados'
import {
  calendarioOficialSeleccion,
  convocatoriasOficialesSeleccion,
  fechaVerificacionSeleccion,
  resultadosOficialesSeleccion
} from '~/data/seleccionColombia2026'

export interface IdentidadPartidoSeleccion {
  fecha: string
  local: string
  visitante: string
}

export function esEquipoSeleccionColombia(nombre: unknown): boolean {
  if (typeof nombre !== 'string') return false
  const normalizado = normalizarNombreEquipo(nombre)
  const sinCategoria = normalizado
    .replace(/\b(seleccion|de|mayor|mayores|masculina|femenina|femenino|femenil|sub\s*-?\s*\d+|u\s*-?\s*\d+|senior)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return sinCategoria === 'colombia'
}

export function filtrarPartidosSeleccionColombia(partidos: readonly PartidoResultado[]): PartidoResultado[] {
  return partidos.filter(partido =>
    esEquipoSeleccionColombia(partido.equipoLocal.nombre)
    || esEquipoSeleccionColombia(partido.equipoVisitante.nombre)
  )
}

export function encontrarPartidoRegistradoSeleccion(
  identidad: IdentidadPartidoSeleccion,
  partidos: readonly PartidoResultado[]
): PartidoResultado | undefined {
  const fecha = identidad.fecha.trim()
  const local = claveEquipo(identidad.local)
  const visitante = claveEquipo(identidad.visitante)

  return partidos.find((partido) =>
    partido.fechaIso.slice(0, 10) === fecha
    && claveEquipo(partido.equipoLocal.nombre) === local
    && claveEquipo(partido.equipoVisitante.nombre) === visitante
  )
}

export function normalizarNombreEquipoSeleccion(nombre: string): string {
  return claveEquipo(nombre)
}

export function obtenerFechaColombia(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(ahora)
  const valores = Object.fromEntries(partes.map(parte => [parte.type, parte.value]))
  return [valores.year, valores.month, valores.day].join('-')
}

export function contarContenidoSeleccionVerificado(fechaActual: string): number {
  const diasDesdeRevision = diferenciaEnDias(fechaVerificacionSeleccion, fechaActual)
  if (diasDesdeRevision < 0 || diasDesdeRevision > 60) return 0

  const proximosPartidos = calendarioOficialSeleccion.filter(partido => partido.fecha >= fechaActual).length
  const resultadosRecientes = resultadosOficialesSeleccion.filter((partido) => {
    const diasDesdeResultado = diferenciaEnDias(partido.fecha, fechaActual)
    return diasDesdeResultado >= 0 && diasDesdeResultado <= 90
  }).length
  const convocatoriasRecientes = convocatoriasOficialesSeleccion.filter((convocatoria) => {
    const diasDesdePublicacion = diferenciaEnDias(convocatoria.publicadaEn, fechaActual)
    return diasDesdePublicacion >= 0 && diasDesdePublicacion <= 45
  }).length

  return proximosPartidos + resultadosRecientes + convocatoriasRecientes
}

function claveEquipo(nombre: string): string {
  if (esEquipoSeleccionColombia(nombre)) return 'colombia'
  return normalizarNombreEquipo(nombre)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizarNombreEquipo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function diferenciaEnDias(fechaAnterior: string, fechaPosterior: string): number {
  const anterior = Date.parse(fechaAnterior + 'T12:00:00Z')
  const posterior = Date.parse(fechaPosterior + 'T12:00:00Z')
  if (!Number.isFinite(anterior) || !Number.isFinite(posterior)) return Number.POSITIVE_INFINITY
  return Math.floor((posterior - anterior) / 86_400_000)
}
