import { describe, expect, it } from 'vitest'
import type { PartidoResultado } from '../../types/resultados'
import {
  filtrarPartidosHoy,
  obtenerClaveEquipoFiltro,
  obtenerOpcionesCompetenciaFiltro,
  obtenerOpcionesEquipoFiltro
} from '../../utils/filtrosPartidosHoy'

const partidos: PartidoResultado[] = [
  {
    id: 'partido-1', deporte: 'futbol', competencia: 'Liga BetPlay', competenciaIdInterno: 'liga-colombia',
    fechaIso: '2026-09-30T20:00:00-05:00', estado: 'programado', destacado: true,
    equipoLocal: { id: '1', idInterno: 'equipo-a', nombre: 'Atlético Nacional', nombreCorto: 'AN' },
    equipoVisitante: { id: '2', idInterno: 'equipo-b', nombre: 'Millonarios', nombreCorto: 'M' }
  },
  {
    id: 'partido-2', deporte: 'baloncesto', competencia: 'Liga BetPlay Baloncesto',
    fechaIso: '2026-09-30T21:00:00-05:00', estado: 'en-vivo',
    equipoLocal: { id: '3', nombre: 'Cóndores', nombreCorto: 'C' },
    equipoVisitante: { id: '4', nombre: 'Titanes', nombreCorto: 'T' }
  },
  {
    id: 'partido-3', deporte: 'futbol', competencia: 'Liga BetPlay', competenciaIdInterno: 'liga-colombia',
    fechaIso: '2026-09-30T18:00:00-05:00', estado: 'finalizado',
    equipoLocal: { id: '5', idInterno: 'equipo-c', nombre: 'Millonarios', nombreCorto: 'M' },
    equipoVisitante: { id: '6', idInterno: 'equipo-d', nombre: 'América de Cali', nombreCorto: 'AC' }
  }
]

const filtrosVacios = {
  deporte: '',
  competencia: '',
  equipo: '',
  estado: '',
  soloDestacados: false
} as const

describe('filtros de partidos de hoy', () => {
  it('mantiene todos los partidos y no muta la respuesta sin filtros', () => {
    expect(filtrarPartidosHoy(partidos, filtrosVacios)).toEqual(partidos)
    expect(partidos).toHaveLength(3)
  })

  it('combina deporte, competencia, estado y destacados', () => {
    expect(filtrarPartidosHoy(partidos, {
      ...filtrosVacios,
      deporte: 'futbol',
      competencia: 'id:liga-colombia',
      estado: 'programado',
      soloDestacados: true
    }).map(partido => partido.id)).toEqual(['partido-1'])
  })

  it('conserva la fecha original para seguir mostrándola en la zona horaria local', () => {
    const encontrados = filtrarPartidosHoy(partidos, {
      ...filtrosVacios,
      deporte: 'baloncesto'
    })

    expect(encontrados[0]?.fechaIso).toBe(partidos[1]?.fechaIso)
    expect(encontrados[0]).toBe(partidos[1])
  })

  it('encuentra un equipo local o visitante por identidad interna sin mezclar homónimos', () => {
    const partidosDeMillonarios = filtrarPartidosHoy(partidos, {
      ...filtrosVacios,
      equipo: 'id:equipo-b'
    })
    expect(partidosDeMillonarios.map(partido => partido.id)).toEqual(['partido-1'])
  })

  it('crea opciones de competición y equipo desde todos los partidos, incluidas fuentes mixtas', () => {
    expect(obtenerOpcionesCompetenciaFiltro(partidos)).toEqual([
      { valor: 'id:liga-colombia', etiqueta: 'Liga BetPlay' },
      { valor: 'nombre:liga betplay baloncesto', etiqueta: 'Liga BetPlay Baloncesto' }
    ])
    expect(obtenerOpcionesEquipoFiltro(partidos)).toHaveLength(6)
    expect(obtenerClaveEquipoFiltro(partidos[1]!.equipoLocal)).toBe('externo:condores:3')
  })
})
