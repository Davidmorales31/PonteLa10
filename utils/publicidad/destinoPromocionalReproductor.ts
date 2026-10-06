/** Selecciona el primer destino y luego uno cada cuatro clics adicionales. */
export function resolverDestinoPromocionalReproductor(clic: number, destinos: string[]): string | null {
  if (!Number.isSafeInteger(clic) || clic < 1 || !destinos.length || (clic - 1) % 4 !== 0) return null
  return destinos[Math.floor((clic - 1) / 4) % destinos.length] || null
}
