export function normalizarRedireccionInterna(
  destino: unknown,
  rutaPredeterminada = '/'
): string {
  if (typeof destino !== 'string') {
    return rutaPredeterminada
  }

  const ruta = destino.trim()

  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\')) {
    return rutaPredeterminada
  }

  return ruta
}
