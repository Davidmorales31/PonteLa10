import { describe, expect, it } from 'vitest'
import type { FixtureFutbolPublico } from '../../types/futbolPublico'
import type { SnapshotFutbolPublicoConIdentidad } from '../../server/utils/lecturaSnapshotsFutbol'
import {
  mezclarSnapshotsFutbolEnPartidosSeo,
  type PartidoSeoAdministrable
} from '../../server/utils/partidosSeoPublicos'

const ahoraMs = Date.parse('2026-10-15T18:10:00.000Z')

const partido: PartidoSeoAdministrable = {
  slug: 'union-magdalena-vs-ind-yumbo',
  competencia: 'torneo-betplay',
  temporada: '2026-II',
  jornada: 'Fecha 13',
  fechaIso: '2026-10-15T18:00:00.000Z',
  local: 'Unión Magdalena',
  visitante: 'Ind. Yumbo',
  estado: 'scheduled',
  golesLocal: null,
  golesVisitante: null,
  estadio: null,
  ciudad: null,
  fuenteOficialUrl: null,
  escudoLocal: null,
  escudoVisitante: null,
  verificadoEn: '2026-10-15T18:01:00.000Z',
  identidadFuente: {
    competenciaSlug: 'torneo-betplay',
    temporada: '2026-II',
    proveedor: 'goal-api',
    idProveedor: 'goal-fixture-13'
  }
}

const fixture: FixtureFutbolPublico = {
  id: '11111111-1111-4111-8111-111111111111',
  businessDate: '2026-10-15',
  kickoffAt: '2026-10-15T18:00:00.000Z',
  competition: { name: 'Torneo BetPlay', country: 'Colombia', season: '2026-II', round: 'Fecha 13', phase: null, group: null },
  homeTeam: { name: 'Unión Magdalena' },
  awayTeam: { name: 'Ind. Yumbo' },
  status: 'live',
  externalStatus: null,
  elapsed: 38,
  goalsHome: 1,
  goalsAway: 0,
  venue: { name: null, city: null },
  providerFetchedAt: '2026-10-15T18:08:00.000Z',
  events: [],
  lineups: [],
  statistics: []
}

const snapshot: SnapshotFutbolPublicoConIdentidad = {
  proveedor: 'goal-api',
  idFixtureProveedor: 'goal-fixture-13',
  fixture
}

describe('marcador en vivo en fichas públicas SEO', () => {
  it('usa el marcador y estado del snapshot público más reciente del fixture exacto', () => {
    const [actualizado] = mezclarSnapshotsFutbolEnPartidosSeo([partido], [snapshot], ahoraMs)

    expect(actualizado).toMatchObject({
      estado: 'live',
      golesLocal: 1,
      golesVisitante: 0,
      verificadoEn: fixture.providerFetchedAt,
      estadoFrescura: { estado: 'actualizado', actualizado: true }
    })
  })

  it('no reemplaza el calendario con un snapshot anterior o con reloj futuro', () => {
    const anterior = {
      ...snapshot,
      fixture: { ...fixture, providerFetchedAt: '2026-10-15T18:00:00.000Z', goalsHome: 2 }
    }
    const futuro = {
      ...snapshot,
      fixture: { ...fixture, providerFetchedAt: new Date(ahoraMs + 31_000).toISOString(), goalsHome: 3 }
    }

    expect(mezclarSnapshotsFutbolEnPartidosSeo([partido], [anterior], ahoraMs)[0])
      .toMatchObject({ estado: 'actualizacion_pendiente', golesLocal: null })
    expect(mezclarSnapshotsFutbolEnPartidosSeo([partido], [futuro], ahoraMs)[0])
      .toMatchObject({ estado: 'actualizacion_pendiente', golesLocal: null })
  })

  it('no cruza partidos si el proveedor o el ID externo no coincide', () => {
    const otroProveedor = { ...snapshot, proveedor: 'api-football' as const }
    const otroId = { ...snapshot, idFixtureProveedor: 'goal-fixture-otro' }

    expect(mezclarSnapshotsFutbolEnPartidosSeo([partido], [otroProveedor, otroId], ahoraMs)[0])
      .toMatchObject({ estado: 'actualizacion_pendiente', golesLocal: null, golesVisitante: null })
  })

  it('no combina un snapshot parcial con un marcador de otra fila', () => {
    const conMarcadorPublicado = { ...partido, golesLocal: 2, golesVisitante: 1 }
    const parcial = { ...snapshot, fixture: { ...fixture, goalsHome: 3, goalsAway: null } }

    expect(mezclarSnapshotsFutbolEnPartidosSeo([conMarcadorPublicado], [parcial], ahoraMs)[0])
      .toMatchObject({ golesLocal: 2, golesVisitante: 1, estado: 'live' })
  })
})
