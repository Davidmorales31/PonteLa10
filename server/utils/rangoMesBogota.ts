/** Convierte AAAA-MM en límites UTC del mes civil de Colombia (UTC-5). */
export function obtenerRangoMesBogota(mes: string): { desde: number, hasta: number } | null {
  const coincidencia = /^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.exec(mes)
  if (!coincidencia) return null
  const anio = Number(coincidencia[1])
  const numeroMes = Number(coincidencia[2])
  return {
    desde: Date.UTC(anio, numeroMes - 1, 1, 5),
    hasta: Date.UTC(anio, numeroMes, 1, 5)
  }
}
