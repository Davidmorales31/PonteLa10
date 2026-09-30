import { describe, expect, it } from 'vitest'
import type { FixtureApiFootball, PartidoResultado } from '../../types/resultados'
import type { EventoTheSportsDb, JugadorAlineacionTheSportsDb } from '../../types/theSportsDb'
import {
  crearNombreCorto,
  mapearFixtureApiFootball,
  obtenerEstadoPartidoApi,
  obtenerEtiquetaEstado,
  ordenarPartidosRelevantes,
  seleccionarPartidoRespuestaDirecta
} from '../../utils/resultadosDeportivos'
import { crearDatosRespuestaDirectaDeportiva } from '../../utils/respuestaDirectaDeportiva'
import {
  mapearAlineacionesTheSportsDb,
  mapearEventoTheSportsDb,
  mapearLineaTiempoTheSportsDb
} from '../../utils/resultadosTheSportsDb'

const fixtureBase: FixtureApiFootball = {
  fixture: { id: 10, date: '2026-07-22T20:00:00-05:00', status: { short: '2H', elapsed: 67 }, venue: { name: 'Metropolitano', city: 'Barranquilla' } },
  league: { id: 1, name: 'Liga BetPlay', country: 'Colombia', round: 'Fecha 4', season: 2026 },
  teams: { home: { id: 1, name: 'Atlético Nacional' }, away: { id: 2, name: 'Millonarios' } },
  goals: { home: 2, away: 1 }
}

describe('resultados deportivos', () => {
  it('normaliza estados del proveedor', () => {
    expect(obtenerEstadoPartidoApi('2H')).toBe('en-vivo')
    expect(obtenerEstadoPartidoApi('FT')).toBe('finalizado')
    expect(obtenerEstadoPartidoApi('NS')).toBe('programado')
  })

  it('mapea un fixture sin filtrar datos del proveedor al cliente', () => {
    const partido = mapearFixtureApiFootball(fixtureBase)
    expect(partido).toMatchObject({ id: '10', estado: 'en-vivo', minuto: 67, marcadorLocal: 2, marcadorVisitante: 1 })
    expect(partido.equipoLocal.nombreCorto).toBe('AN')
  })

  it('prioriza partidos en vivo y destacados', () => {
    const partidoFinalizado = { ...mapearFixtureApiFootball(fixtureBase), id: 'final', estado: 'finalizado' as const }
    const partidoEnVivo = { ...mapearFixtureApiFootball(fixtureBase), id: 'vivo', destacado: false }
    expect(ordenarPartidosRelevantes([partidoFinalizado, partidoEnVivo])[0]?.id).toBe('vivo')
  })

  it('selecciona la respuesta de jornada en vivo, próxima o recién finalizada', () => {
    const finalizado = { ...mapearFixtureApiFootball(fixtureBase), id: 'final', estado: 'finalizado' as const }
    const programadoTarde = {
      ...mapearFixtureApiFootball(fixtureBase), id: 'tarde', estado: 'programado' as const,
      fechaIso: '2026-07-22T23:00:00Z'
    }
    const programadoTemprano = {
      ...mapearFixtureApiFootball(fixtureBase), id: 'temprano', estado: 'programado' as const,
      fechaIso: '2026-07-22T18:00:00Z'
    }
    const finalizadoReciente = {
      ...finalizado, id: 'final-reciente', fechaIso: '2026-07-23T18:00:00Z'
    }
    const enVivo = { ...finalizado, id: 'vivo', estado: 'en-vivo' as const }

    expect(seleccionarPartidoRespuestaDirecta([finalizado, programadoTarde, programadoTemprano])?.id).toBe('temprano')
    expect(seleccionarPartidoRespuestaDirecta([programadoTemprano, enVivo])?.id).toBe('vivo')
    expect(seleccionarPartidoRespuestaDirecta([finalizado, finalizadoReciente])?.id).toBe('final-reciente')
    expect(seleccionarPartidoRespuestaDirecta([])).toBeNull()
  })

  it('expone fechas, estadio, resultado y zona horaria solo con datos válidos', () => {
    const partido = mapearFixtureApiFootball(fixtureBase)
    const datos = crearDatosRespuestaDirectaDeportiva(partido, 'America/Bogota')

    expect(datos).toMatchObject({
      fecha: expect.stringContaining('22 de julio de 2026'),
      hora: '20:00',
      referenciaZonaHoraria: expect.stringContaining('America/Bogota'),
      competencia: 'Liga BetPlay',
      estadio: 'Metropolitano, Barranquilla',
      estado: 'En vivo',
      resultado: '2–1'
    })
  })

  it('convierte la hora a la zona elegida y omite marcadores no confirmados', () => {
    const programado = {
      ...mapearFixtureApiFootball(fixtureBase), estado: 'programado' as const,
      marcadorLocal: 2, marcadorVisitante: 1, estadio: undefined, ciudad: undefined
    }
    const datos = crearDatosRespuestaDirectaDeportiva(programado, 'Asia/Tokyo')
    const datosInvalidos = crearDatosRespuestaDirectaDeportiva({
      ...programado, fechaIso: 'fecha-no-valida', competencia: '   '
    }, 'zona-no-valida')
    const datosSoloFecha = crearDatosRespuestaDirectaDeportiva({ ...programado, fechaIso: '2026-07-22' }, 'Asia/Tokyo')

    expect(datos).toMatchObject({
      fecha: expect.stringContaining('23 de julio de 2026'),
      hora: '10:00',
      referenciaZonaHoraria: expect.stringContaining('Asia/Tokyo'),
      estadio: null,
      resultado: null,
      descripcionMarcador: 'Por jugar'
    })
    expect(datosInvalidos).toMatchObject({
      fecha: null,
      hora: null,
      referenciaZonaHoraria: null,
      competencia: null,
      resultado: null
    })
    expect(datosSoloFecha).toMatchObject({
      fecha: expect.stringContaining('22 de julio de 2026'),
      hora: null,
      referenciaZonaHoraria: null
    })
  })

  it('genera etiquetas legibles y abreviaciones estables', () => {
    const partido = mapearFixtureApiFootball(fixtureBase)
    expect(obtenerEtiquetaEstado(partido)).toBe('67′')
    expect(crearNombreCorto('Real Madrid Club')).toBe('RMC')
    expect(obtenerEtiquetaEstado({ ...partido, estado: 'finalizado' } as PartidoResultado)).toBe('Finalizado')
  })

  it('muestra el horario del partido en la zona elegida y conserva Bogotá por defecto', () => {
    const partidoProgramado = { ...mapearFixtureApiFootball(fixtureBase), estado: 'programado' as const }

    expect(obtenerEtiquetaEstado(partidoProgramado)).toBe('20:00')
    expect(obtenerEtiquetaEstado(partidoProgramado, 'Asia/Tokyo')).toBe('10:00')
  })

  it('adapta un evento gratuito al contrato interno', () => {
    const evento: EventoTheSportsDb = {
      idEvent: '2397222',
      strTimestamp: '2026-07-22T23:00:00',
      strStatus: 'FT',
      strLeague: 'American USL Championship',
      strHomeTeam: 'Lexington SC',
      strAwayTeam: 'Oakland Roots',
      idHomeTeam: '147061',
      idAwayTeam: '141177',
      intHomeScore: '2',
      intAwayScore: '0'
    }

    expect(mapearEventoTheSportsDb(evento)).toMatchObject({
      id: 'tsdb-2397222',
      estado: 'finalizado',
      marcadorLocal: 2,
      marcadorVisitante: 0
    })
  })

  it('traduce la cronología gratuita a eventos deportivos', () => {
    const eventos = mapearLineaTiempoTheSportsDb([
      {
        idTimeline: '1',
        strTimeline: 'Card',
        strTimelineDetail: 'Yellow Card',
        intTime: '6',
        idTeam: '10',
        strPlayer: 'Jugador prueba'
      },
      {
        idTimeline: '2',
        strTimeline: 'subst',
        intTime: '46',
        idTeam: '10',
        strPlayer: 'Jugador saliente',
        strAssist: 'Jugador entrante'
      }
    ])

    expect(eventos[0]).toMatchObject({ tipo: 'tarjeta-amarilla', detalle: 'Tarjeta amarilla' })
    expect(eventos[1]).toMatchObject({
      tipo: 'cambio',
      jugador: 'Jugador entrante',
      detalle: 'Entra · Sale: Jugador saliente'
    })
  })

  it('no publica como completa una alineación gratuita parcial', () => {
    const alineacionParcial: JugadorAlineacionTheSportsDb[] = [
      {
        idLineup: '1',
        idTeam: '10',
        strTeam: 'Equipo local',
        strSubstitute: 'No',
        intSquadNumber: '10',
        strPlayer: 'Jugador prueba'
      }
    ]

    expect(mapearAlineacionesTheSportsDb(alineacionParcial)).toEqual([])
  })
})
