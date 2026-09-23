/**
 * Convierte una fecha instantánea al valor que espera `input[type=datetime-local]`.
 * Ese campo no tiene zona horaria: serializarla con `toISOString()` desplaza la
 * hora visible al UTC.
 */
export function fechaParaCampoLocal(fecha: Date): string {
  const desplazamiento = fecha.getTimezoneOffset() * 60_000
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 16)
}
