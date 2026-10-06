import { describe, expect, it } from 'vitest'
import type { PartidoSeoPublico } from '../../server/utils/partidosSeoPublicos'
import { buscarCorrespondenciaPartidoSeo } from '../../server/utils/partidoSeoCorrespondencia'

const fixture: PartidoSeoPublico = {
  slug: 'atletico-nacional-vs-millonarios-liga-betplay-2026-ii',
  competencia: 'liga-betplay',
  temporada: '2026-II',
  jornada: 'Jornada 15',
  fechaIso: '2026-10-07T00:30:00.000Z',
  local: 'Atlético Nacional',
  visitante: 'Millonarios FC',
  estado: 'scheduled',
  golesLocal: null,
  golesVisitante: null,
  estadio: null,
  ciudad: null,
  fuenteOficialUrl: 'https://dimayor.com.co/programaciones-competencias-dimayor-2026/',
  escudoLocal: null,
  escudoVisitante: null,
  verificadoEn: '2026-10-06T13:00:00.000Z'
}

describe('correspondencia de resultados con ficha canónica', () => {
  it('resuelve por equipos y horario de Colombia una ficha de Liga DIMAYOR', () => {
    expect(buscarCorrespondenciaPartidoSeo([fixture], {
      competencia: 'Liga BetPlay',
      fechaIso: '2026-10-07T00:15:00.000Z',
      local: 'Atletico Nacional',
      visitante: 'Millonarios'
    })?.slug).toBe(fixture.slug)
  })

  it('no vincula otras competiciones, partidos de otro día o encuentros invertidos', () => {
    expect(buscarCorrespondenciaPartidoSeo([fixture], {
      competencia: 'Premier League',
      fechaIso: fixture.fechaIso,
      local: fixture.local,
      visitante: fixture.visitante
    })).toBeNull()
    expect(buscarCorrespondenciaPartidoSeo([fixture], {
      competencia: 'Liga BetPlay',
      fechaIso: '2026-10-08T00:30:00.000Z',
      local: fixture.local,
      visitante: fixture.visitante
    })).toBeNull()
    expect(buscarCorrespondenciaPartidoSeo([fixture], {
      competencia: 'Liga BetPlay',
      fechaIso: fixture.fechaIso,
      local: fixture.visitante,
      visitante: fixture.local
    })).toBeNull()
  })
})
