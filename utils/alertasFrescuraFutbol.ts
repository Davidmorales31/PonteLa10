type EstadoSaludFrescuraFutbol = 'saludable' | 'atencion' | 'sin_datos'

interface GrupoSaludFrescuraFutbol {
  estado: EstadoSaludFrescuraFutbol
}

export interface DatosSaludFrescuraFutbol {
  calendario: GrupoSaludFrescuraFutbol[]
  tablas: GrupoSaludFrescuraFutbol[]
  coberturaCompleta: boolean
  mexico?: { calendario: GrupoSaludFrescuraFutbol[], tablas: GrupoSaludFrescuraFutbol[], coberturaCompleta: boolean }
}

export function generarAlertasFrescuraFutbol(
  salud: DatosSaludFrescuraFutbol | null | undefined,
  hayError: boolean
): string[] {
  const alertas: string[] = []
  if (!salud) {
    if (hayError) alertas.push('Monitor de frescura de fútbol no disponible')
    return alertas
  }

  if (salud.calendario.concat(salud.tablas).some(grupo => grupo.estado !== 'saludable')) {
    alertas.push('Hay datos deportivos pendientes de actualización')
  }
  // México aún no está lanzado: sin datos no alerta, pero datos vencidos sí.
  if (salud.mexico?.calendario.concat(salud.mexico.tablas).some(grupo => grupo.estado === 'atencion')) {
    alertas.push('Hay datos deportivos de México pendientes de actualización')
  }
  if (!salud.coberturaCompleta || salud.mexico?.coberturaCompleta === false) alertas.push('La cobertura del monitor de frescura es parcial')
  if (hayError) alertas.push('Monitor de frescura de fútbol no disponible')
  return alertas
}
