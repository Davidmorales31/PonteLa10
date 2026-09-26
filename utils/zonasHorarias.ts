export const zonaHorariaColombia = 'America/Bogota'

export function normalizarZonaHoraria(valor: unknown): string {
  if (typeof valor !== 'string' || valor.length > 64) {
    return zonaHorariaColombia
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: valor })
    return valor
  } catch {
    return zonaHorariaColombia
  }
}

export function obtenerFechaEnZonaHoraria(fecha: Date, zonaHoraria = zonaHorariaColombia): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: normalizarZonaHoraria(zonaHoraria)
  }).format(fecha)
}
