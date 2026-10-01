import type { ObjetivoClasificacionFutbol } from './sincronizadorClasificaciones'
import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'

/**
 * Decodifica una allowlist privada en formato competencia:temporada. Un valor
 * vacío equivale a no ejecutar consultas, nunca a permitir todas las ligas.
 */
export function leerAllowlistClasificacionesFutbol(valor: unknown): ObjetivoClasificacionFutbol[] {
  if (valor === undefined || valor === null || valor === '') return []
  if (typeof valor !== 'string') throw new Error('La allowlist de clasificaciones no es válida.')

  const resultado: ObjetivoClasificacionFutbol[] = []
  const vistos = new Set<string>()
  for (const item of valor.split(',')) {
    const separador = item.lastIndexOf(':')
    const competenciaExterna = separador > 0 ? item.slice(0, separador).trim() : ''
    const temporada = separador > 0 ? item.slice(separador + 1).trim() : ''
    if (!competenciaExterna || !temporada || competenciaExterna.length > 128 || temporada.length > 32) {
      throw new Error('La allowlist de clasificaciones no es válida.')
    }
    const clave = `${competenciaExterna}\u0000${temporada}`
    if (!vistos.has(clave)) {
      vistos.add(clave)
      resultado.push({ competenciaExterna, temporada })
    }
  }
  return resultado
}

export function fechaNegocioBogota(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(ahora)
  const leer = (tipo: 'year' | 'month' | 'day') => partes.find(parte => parte.type === tipo)?.value
  const anio = leer('year')
  const mes = leer('month')
  const dia = leer('day')
  if (!anio || !mes || !dia) throw new Error('No fue posible calcular la fecha de negocio Bogotá.')
  return `${anio}-${mes}-${dia}`
}

/** Comparte una reserva ya concedida únicamente dentro de una activación. */
export function crearGateReservaClasificaciones(
  reclamar: (provider: IdentificadorProveedorFutbol) => Promise<boolean>
): (provider: IdentificadorProveedorFutbol) => Promise<boolean> {
  const concedidos = new Set<IdentificadorProveedorFutbol>()
  return async (provider) => {
    if (concedidos.has(provider)) return true
    const concedido = await reclamar(provider)
    if (concedido) concedidos.add(provider)
    return concedido
  }
}
