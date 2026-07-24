import type { PartidoResultado } from '~/types/resultados'

export interface ContenidoNotificacionMarcador {
  titulo: string
  cuerpo: string
}

export function alternarIdPartido(idsPartidos: string[], idPartido: string): string[] {
  return idsPartidos.includes(idPartido)
    ? idsPartidos.filter(id => id !== idPartido)
    : [...new Set([...idsPartidos, idPartido])]
}

export function cambioMarcador(
  partidoAnterior: PartidoResultado,
  partidoActual: PartidoResultado
): boolean {
  return partidoAnterior.marcadorLocal !== partidoActual.marcadorLocal
    || partidoAnterior.marcadorVisitante !== partidoActual.marcadorVisitante
}

export function esIncrementoMarcador(
  partidoAnterior: PartidoResultado,
  partidoActual: PartidoResultado
): boolean {
  const localAnterior = partidoAnterior.marcadorLocal
  const localActual = partidoActual.marcadorLocal
  const visitanteAnterior = partidoAnterior.marcadorVisitante
  const visitanteActual = partidoActual.marcadorVisitante

  return (typeof localAnterior === 'number' && typeof localActual === 'number' && localActual > localAnterior)
    || (typeof visitanteAnterior === 'number' && typeof visitanteActual === 'number' && visitanteActual > visitanteAnterior)
}

export function crearContenidoNotificacionMarcador(
  partidoAnterior: PartidoResultado,
  partidoActual: PartidoResultado
): ContenidoNotificacionMarcador {
  const marcador = `${partidoActual.equipoLocal.nombre} ${partidoActual.marcadorLocal ?? '-'} - ${partidoActual.marcadorVisitante ?? '-'} ${partidoActual.equipoVisitante.nombre}`
  const esGol = partidoActual.deporte === 'futbol' && esIncrementoMarcador(partidoAnterior, partidoActual)

  return {
    titulo: esGol ? `¡Gol! ${marcador}` : `Marcador actualizado: ${marcador}`,
    cuerpo: partidoActual.minuto
      ? `${esGol ? 'El marcador cambió' : 'Actualización'} en el minuto ${partidoActual.minuto}.`
      : 'El marcador acaba de cambiar.'
  }
}
