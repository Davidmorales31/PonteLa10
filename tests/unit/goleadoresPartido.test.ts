import { describe, expect, it } from 'vitest'
import type { DetallePartidoResultado } from '~/types/resultados'
import { agruparGoleadoresPartido } from '~/utils/goleadoresPartido'

const detalleBase: DetallePartidoResultado = {
  partido: {
    id: 'partido-1', deporte: 'futbol', competencia: 'Liga', fechaIso: '2026-10-03T15:00:00Z',
    estado: 'finalizado', marcadorLocal: 2, marcadorVisitante: 1,
    equipoLocal: { id: 'local', nombre: 'Equipo local', nombreCorto: 'LOC' },
    equipoVisitante: { id: 'visitante', nombre: 'Equipo visitante', nombreCorto: 'VIS' }
  },
  estadisticas: [],
  eventos: [
    { id: 'gol-1', minuto: '14′', tipo: 'gol', equipoId: 'local', jugador: 'Delantero Uno' },
    { id: 'gol-2', minuto: '59′', tipo: 'gol', equipoId: 'visitante', jugador: 'Delantero Dos' },
    { id: 'gol-3', minuto: '81′', tipo: 'gol', equipoId: 'local', jugador: 'Sin jugador identificado' },
    { id: 'tarjeta-1', minuto: '88′', tipo: 'tarjeta-amarilla', equipoId: 'local', jugador: 'Defensa' }
  ],
  alineaciones: [],
  clasificacion: [],
  actualizadoEn: '2026-10-03T17:00:00Z',
  origen: 'base-datos'
}

describe('agruparGoleadoresPartido', () => {
  it('agrupa autores y minutos desde eventos existentes, ignorando eventos sin autor', () => {
    expect(agruparGoleadoresPartido(detalleBase)).toEqual([
      { equipoId: 'local', equipo: 'Equipo local', goleadores: [{ jugador: 'Delantero Uno', minuto: '14′' }] },
      { equipoId: 'visitante', equipo: 'Equipo visitante', goleadores: [{ jugador: 'Delantero Dos', minuto: '59′' }] }
    ])
  })

  it('no muestra autores si no hay snapshot disponible ni para deportes distintos del fútbol', () => {
    expect(agruparGoleadoresPartido(null)).toEqual([])
    expect(agruparGoleadoresPartido({
      ...detalleBase,
      partido: { ...detalleBase.partido, deporte: 'baloncesto' }
    })).toEqual([])
  })
})
