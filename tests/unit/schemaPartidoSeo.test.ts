import { describe, expect, it } from 'vitest'
import { construirSportsEventSeo, etiquetaEstadoSeoPartido, normalizarEstadoSeoPartido } from '../../utils/schemaPartidoSeo'

const partidoBase = {
  local: 'Atlético Nacional',
  visitante: 'Millonarios',
  fechaIso: '2026-10-05T23:00:00.000Z',
  estado: 'scheduled',
  golesLocal: null,
  golesVisitante: null,
  estadio: 'Estadio Atanasio Girardot',
  ciudad: 'Medellín',
  urlCanonica: 'https://www.pont3la10.com/donde-ver/atletico-nacional-vs-millonarios',
  descripcion: 'Ficha informativa del partido.'
}

describe('schema SportsEvent público', () => {
  it('no presenta como próximo un partido con hora pasada que sigue marcado programado', () => {
    expect(normalizarEstadoSeoPartido('scheduled', '2026-10-04T19:00:00.000Z', undefined, Date.parse('2026-10-05T12:00:00.000Z')))
      .toBe('actualizacion_pendiente')
    expect(normalizarEstadoSeoPartido('scheduled', '2026-10-06T19:00:00.000Z', undefined, Date.parse('2026-10-05T12:00:00.000Z')))
      .toBe('scheduled')
  })

  it('oculta como EN VIVO un estado sin una verificación reciente', () => {
    const ahora = Date.parse('2026-10-05T12:00:00.000Z')
    expect(normalizarEstadoSeoPartido('in_progress', '2026-10-05T11:00:00.000Z', '2026-10-05T11:55:00.000Z', ahora))
      .toBe('actualizacion_pendiente')
    expect(normalizarEstadoSeoPartido('in_progress', '2026-10-05T11:00:00.000Z', '2026-10-05T11:59:00.000Z', ahora))
      .toBe('in_progress')
    expect(construirSportsEventSeo({ ...partidoBase, estado: 'in_progress', verificadoEn: new Date(Date.now() - 10 * 60 * 1000).toISOString() }))
      .toBeNull()
  })

  it('no convierte estados nulos o desconocidos de partidos vencidos en próximos', () => {
    const ahora = Date.parse('2026-10-05T12:00:00.000Z')
    expect(normalizarEstadoSeoPartido(null, '2026-10-05T11:00:00.000Z', undefined, ahora))
      .toBe('actualizacion_pendiente')
    expect(normalizarEstadoSeoPartido('unknown', '2026-10-05T11:00:00.000Z', undefined, ahora))
      .toBe('actualizacion_pendiente')
    expect(normalizarEstadoSeoPartido('unknown', '2026-10-06T11:00:00.000Z', undefined, ahora))
      .toBe('actualizacion_pendiente')
    expect(normalizarEstadoSeoPartido('abandoned', '2026-10-05T11:00:00.000Z', undefined, ahora))
      .toBe('abandoned')
    expect(etiquetaEstadoSeoPartido('abandoned')).toBe('ABANDONADO')
    expect(etiquetaEstadoSeoPartido('aborted')).toBe('ABANDONADO')
    expect(construirSportsEventSeo({ ...partidoBase, estado: 'abandoned' })?.eventStatus)
      .toBe('https://schema.org/EventCancelled')
  })

  it('distingue partidos cancelados, suspendidos y aplazados', () => {
    expect(etiquetaEstadoSeoPartido('cancelled')).toBe('CANCELADO')
    expect(etiquetaEstadoSeoPartido('suspended')).toBe('SUSPENDIDO')
    expect(etiquetaEstadoSeoPartido('postponed')).toBe('APLAZADO')
  })

  it('omite el evento si faltan los datos obligatorios de ubicación o fecha válida', () => {
    expect(construirSportsEventSeo({ ...partidoBase, estadio: null })).toBeNull()
    expect(construirSportsEventSeo({ ...partidoBase, fechaIso: 'fecha inválida' })).toBeNull()
    expect(construirSportsEventSeo({ ...partidoBase, estado: 'actualizacion_pendiente' })).toBeNull()
  })

  it('marca el evento en vivo y conserva los datos públicos verificados', () => {
    const schema = construirSportsEventSeo({
      ...partidoBase,
      estado: 'in_progress',
      verificadoEn: new Date().toISOString(),
      golesLocal: 1,
      golesVisitante: 0
    })
    expect(schema?.['@type']).toBe('SportsEvent')
    expect(schema?.eventStatus).toBe('https://schema.org/EventInProgress')
    expect(schema?.homeTeamScore).toBe('1')
    expect(schema?.location).toMatchObject({ name: 'Estadio Atanasio Girardot' })
  })

  it('representa partidos reprogramados y finalizados con su estado real', () => {
    expect(construirSportsEventSeo({ ...partidoBase, estado: 'postponed' })?.eventStatus)
      .toBe('https://schema.org/EventPostponed')
    expect(construirSportsEventSeo({ ...partidoBase, estado: 'finished' })?.eventStatus)
      .toBe('https://schema.org/EventCompleted')
  })
})
