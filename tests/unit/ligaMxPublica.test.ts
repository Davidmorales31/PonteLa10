import { describe, expect, it } from 'vitest'
import { darFormaRespuestaLigaMx, type FilaPartidoPublicoLigaMx, type FilaPosicionPublicaLigaMx } from '../../server/utils/ligaMxPublica'

const ahora = new Date('2026-11-19T15:00:00Z')
const partido = (id: string, fecha: string, extra: Partial<FilaPartidoPublicoLigaMx> = {}): FilaPartidoPublicoLigaMx => ({
  competition_slug: 'liga-mx', season: '2026-2027', tournament: 'Apertura', provider_fixture_id: id, round_name: 'Jornada 17',
  scheduled_at: fecha, home_team: 'Querétaro', away_team: 'Necaxa', status: 'scheduled', goals_home: null, goals_away: null,
  venue: 'Estadio La Corregidora', city: null, checked_at: '2026-11-19T14:00:00Z', ...extra
})
const fila = (equipo: string, posicion: number, extra: Partial<FilaPosicionPublicaLigaMx> = {}): FilaPosicionPublicaLigaMx => ({
  competition_slug: 'liga-mx', season: '2026-2027', phase: 'Apertura', team_key: equipo.toLowerCase(), team_name: equipo, position: posicion,
  played: 16, won: 10, drawn: 2, lost: 4, goals_for: 37, goals_against: 26, goal_difference: 11, points: 32, checked_at: '2026-11-19T14:30:00Z', ...extra
})

describe('respuesta pública de la Liga MX', () => {
  it('ordena el calendario, limita la ventana y descarta ligas ajenas', () => {
    const r = darFormaRespuestaLigaMx([
      partido('tarde', '2026-11-25T01:00:00Z'),
      partido('antiguo', '2026-09-01T01:00:00Z'),
      partido('lejano', '2027-04-01T01:00:00Z'),
      partido('femenil', '2026-11-23T01:00:00Z', { competition_slug: 'liga-mx-femenil' }),
      partido('ajeno', '2026-11-23T01:00:00Z', { competition_slug: 'liga-betplay' }),
      partido('temprano', '2026-11-23T01:00:00Z')
    ], [], ahora)
    expect(r.partidos.map(p => p.id)).toEqual(['temprano', 'femenil', 'tarde'])
    expect(r.partidos[0]).toMatchObject({ competenciaNombre: 'Liga MX', jornada: 'Jornada 17', fechaMexico: '2026-11-22' })
    expect(r.estado).toBe('disponible')
    expect(r.hoyMexico).toBe('2026-11-19')
  })

  it('ordena la tabla por liga, temporada, fase y posición', () => {
    const r = darFormaRespuestaLigaMx([], [
      fila('Pumas', 3), fila('Cruz Azul', 1), fila('Tigres', 2),
      fila('Rayadas', 1, { competition_slug: 'liga-mx-femenil' }), fila('Otro', 1, { competition_slug: 'otra' })
    ], ahora)
    expect(r.tabla.map(f => f.equipo)).toEqual(['Cruz Azul', 'Tigres', 'Pumas', 'Rayadas'])
    expect(r.actualizadoEn).toBe('2026-11-19T14:30:00Z')
  })

  it('sin datos devuelve estado sin_datos y listas vacías', () => {
    expect(darFormaRespuestaLigaMx([], [], ahora)).toMatchObject({ estado: 'sin_datos', partidos: [], tabla: [], actualizadoEn: null })
  })
})
