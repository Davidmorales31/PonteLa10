import { describe, expect, it } from 'vitest'
import type { PartidoLigaMx, PosicionLigaMx } from '../../types/ligaMx'
import { agruparPorJornada, fasesDeTabla, filasDeTabla, marcador, proximosYRecientes, torneoActual } from '../../utils/ligaMxVista'

const ahora = Date.parse('2026-11-19T15:00:00Z')
const p = (id: string, fecha: string, extra: Partial<PartidoLigaMx> = {}): PartidoLigaMx => ({
  id, competencia: 'liga-mx', competenciaNombre: 'Liga MX', temporada: '2026-2027', torneo: 'Apertura', jornada: 'Jornada 17',
  fechaIso: fecha, fechaMexico: fecha.slice(0, 10), local: 'A', visitante: 'B', estado: 'scheduled', golesLocal: null, golesVisitante: null,
  estadio: null, ciudad: null, verificadoEn: fecha, ...extra
})
const t = (equipo: string, posicion: number, fase = 'Apertura', competencia = 'liga-mx'): PosicionLigaMx => ({
  competencia, competenciaNombre: 'x', temporada: '2026-2027', fase, equipoClave: equipo, equipo, posicion, jugados: 1, ganados: 1, empatados: 0,
  perdidos: 0, golesFavor: 1, golesContra: 0, diferencia: 1, puntos: 3, verificadoEn: ''
})

describe('vista de la Liga MX', () => {
  it('el torneo actual es el del partido más cercano a hoy', () => {
    expect(torneoActual([p('a', '2026-11-23T01:00:00Z'), p('b', '2027-02-01T01:00:00Z', { torneo: 'Clausura' })], [], ahora)).toBe('Apertura')
    expect(torneoActual([], [t('X', 1, 'Clausura')], ahora)).toBe('Clausura')
    expect(torneoActual([], [], ahora)).toBeNull()
  })

  it('las fases de la tabla ponen el torneo actual primero y esconden "Current" si hay otra', () => {
    const tabla = [t('A', 1, 'Current', 'liga-mx-femenil'), t('B', 1, 'Apertura', 'liga-mx-femenil'), t('C', 1, 'Clausura', 'liga-mx-femenil')]
    expect(fasesDeTabla(tabla, 'liga-mx-femenil', 'Clausura')).toEqual(['Clausura', 'Apertura'])
    expect(fasesDeTabla([t('A', 1, 'Current', 'liga-mx-femenil')], 'liga-mx-femenil', null)).toEqual(['Current'])
    expect(fasesDeTabla(tabla, 'liga-mx', null)).toEqual([])
  })

  it('filtra y ordena la tabla por posición', () => {
    const tabla = [t('C', 3), t('A', 1), t('B', 2, 'Clausura')]
    expect(filasDeTabla(tabla, 'liga-mx', 'Apertura').map(f => f.equipo)).toEqual(['A', 'C'])
    expect(filasDeTabla(tabla, 'liga-mx', null)).toHaveLength(3)
  })

  it('agrupa por jornada en orden cronológico', () => {
    const grupos = agruparPorJornada([p('3', '2026-11-30T01:00:00Z', { jornada: 'Jornada 18' }), p('1', '2026-11-21T01:00:00Z'), p('2', '2026-11-22T01:00:00Z')])
    expect(grupos.map(g => [g.jornada, g.partidos.map(x => x.id)])).toEqual([['Jornada 17', ['1', '2']], ['Jornada 18', ['3']]])
  })

  it('separa próximos y recientes y no cuenta aplazados ni terminados como próximos', () => {
    const { proximos, recientes } = proximosYRecientes([
      p('hecho', '2026-11-14T01:00:00Z', { estado: 'finished', golesLocal: 1, golesVisitante: 0 }),
      p('antes', '2026-11-10T01:00:00Z', { estado: 'finished', golesLocal: 2, golesVisitante: 2 }),
      p('vivo', '2026-11-19T14:00:00Z', { estado: 'live' }),
      p('aplazado', '2026-11-20T01:00:00Z', { estado: 'postponed' }),
      p('futuro', '2026-11-23T01:00:00Z')
    ], ahora)
    expect(proximos.map(x => x.id)).toEqual(['vivo', 'futuro'])
    expect(recientes.map(x => x.id)).toEqual(['hecho', 'antes'])
  })

  it('el marcador muestra vs mientras no haya goles', () => {
    expect(marcador(p('x', '2026-11-23T01:00:00Z'))).toBe('vs')
    expect(marcador(p('x', '2026-11-23T01:00:00Z', { golesLocal: 3, golesVisitante: 1 }))).toBe('3 – 1')
  })
})

describe('clubes de la Liga MX', () => {
  it('toma los clubes de la tabla, completa con los partidos y ordena por posición', async () => {
    const { clubesDeLigaMx, partidosDelClub, estadioDelClub } = await import('../../utils/ligaMxVista')
    const tabla = [{ ...t('Cruz Azul', 1), equipoClave: 'cruz-azul' }, { ...t('Pumas UNAM', 2), equipoClave: 'pumas-unam' }]
    const partidos = [
      p('1', '2026-11-21T01:00:00Z', { local: 'Cruz Azul', visitante: 'Atlético San Luis', estadio: 'Estadio Ciudad de los Deportes' }),
      p('2', '2026-11-28T01:00:00Z', { local: 'Cruz Azul', visitante: 'Pumas UNAM', estadio: 'Estadio Ciudad de los Deportes' }),
      p('3', '2026-11-29T01:00:00Z', { local: 'Pumas UNAM', visitante: 'Cruz Azul', estadio: 'Estadio Olímpico' }),
      p('4', '2026-11-29T01:00:00Z', { competencia: 'liga-mx-femenil', local: 'Rayadas', visitante: 'Tigres' })
    ]
    const clubes = clubesDeLigaMx(tabla, partidos, 'Apertura')
    expect(clubes.map(c => c.clave)).toEqual(['cruz-azul', 'pumas-unam', 'atletico-san-luis'])
    expect(clubes[2]).toMatchObject({ nombre: 'Atlético San Luis', posicion: null })
    expect(partidosDelClub(partidos, 'cruz-azul').map(x => x.id)).toEqual(['1', '2', '3'])
    expect(estadioDelClub(partidos, 'cruz-azul')).toBe('Estadio Ciudad de los Deportes')
    expect(estadioDelClub(partidos, 'atletico-san-luis')).toBeNull()
  })
})
