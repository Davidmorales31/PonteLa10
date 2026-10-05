import type { DetallePartidoResultado } from '~/types/resultados'

export interface GrupoGoleadoresPartido {
  equipoId: 'local' | 'visitante'
  equipo: string
  goleadores: Array<{ jugador: string; minuto: string }>
}

/** Deriva los autores de gol solo de los eventos ya guardados en el detalle público. */
export function agruparGoleadoresPartido(
  detalle: DetallePartidoResultado | null | undefined
): GrupoGoleadoresPartido[] {
  if (!detalle || detalle.partido.deporte !== 'futbol') return []

  return ([
    { equipoId: 'local', equipo: detalle.partido.equipoLocal.nombre },
    { equipoId: 'visitante', equipo: detalle.partido.equipoVisitante.nombre }
  ] as const).flatMap(({ equipoId, equipo }) => {
    const goleadores = detalle.eventos
      .filter(evento => evento.tipo === 'gol' && evento.equipoId === equipoId)
      .flatMap(evento => {
        const jugador = evento.jugador.trim()
        if (!jugador || jugador.toLocaleLowerCase('es-CO') === 'sin jugador identificado') return []
        return [{ jugador, minuto: evento.minuto }]
      })

    return goleadores.length ? [{ equipoId, equipo, goleadores }] : []
  })
}
