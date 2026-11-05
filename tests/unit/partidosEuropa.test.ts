import { describe, expect, it } from 'vitest'
import { jugadoresColombianosEuropa } from '../../data/jugadoresColombianosEuropa'
import { prepararPartidosClubesEuropa } from '../../utils/partidosEuropa'
import type { PartidoResultado } from '../../types/resultados'

function partido(cambios: Partial<PartidoResultado> = {}): PartidoResultado {
  return {
    id: 'encuentro-1',
    deporte: 'futbol',
    competencia: 'Bundesliga',
    fechaIso: '2026-11-04T19:00:00Z',
    estado: 'programado',
    equipoLocal: { id: 'bayern', nombre: 'Bayern Munich', nombreCorto: 'Bayern' },
    equipoVisitante: { id: 'rival', nombre: 'Rival', nombreCorto: 'Rival' },
    ...cambios
  }
}

describe('tarjetas de partidos de los clubes de colombianos en Europa', () => {
  it('reconoce alias exactos y deduplica encuentros aunque haya varios jugadores en un club', () => {
    const evento = partido({ equipoVisitante: { id: 'betis', nombre: 'Real Betis', nombreCorto: 'Betis' } })
    const noRelacionado = partido({ id: 'otro', equipoLocal: { id: 'bayer', nombre: 'Bayer Leverkusen', nombreCorto: 'Bayer' } })
    expect(prepararPartidosClubesEuropa([evento, evento, noRelacionado], jugadoresColombianosEuropa, '')).toHaveLength(1)
  })

  it('conserva cero como marcador y deja nulos los goles aún desconocidos', () => {
    const tarjetas = prepararPartidosClubesEuropa([
      partido({ id: 'cero', estado: 'finalizado', marcadorLocal: 0, marcadorVisitante: 2 }),
      partido({ id: 'pendiente' })
    ], jugadoresColombianosEuropa, '2026-11-04T20:00:00Z')
    expect(tarjetas[0]?.partido.golesLocal).toBe(0)
    expect(tarjetas[0]?.estado).toBe('FINALIZADO')
    expect(tarjetas[1]?.partido.golesLocal).toBeNull()
    expect(tarjetas[1]?.partido.golesVisitante).toBeNull()
    expect(tarjetas[1]?.partido.verificadoEn).toBe('2026-11-04T20:00:00Z')
  })

  it('dirige a resultados con el identificador codificado y descarta fechas inválidas u otros deportes', () => {
    const tarjetas = prepararPartidosClubesEuropa([
      partido({ id: 'api/123', estado: 'en-vivo' }),
      partido({ id: 'invalido', fechaIso: 'sin-fecha' }),
      partido({ id: 'otro-deporte', deporte: 'baloncesto' })
    ], jugadoresColombianosEuropa, '')
    expect(tarjetas).toHaveLength(1)
    expect(tarjetas[0]?.ruta).toBe('/resultados/api%2F123')
    expect(tarjetas[0]?.estado).toBe('EN VIVO')
    expect(tarjetas[0]?.partido.fuenteOficialUrl).toBeNull()
  })

  it('ordena por fecha sin cambiar la colección recibida', () => {
    const eventos = [partido({ id: 'tarde', fechaIso: '2026-11-04T21:00:00Z' }), partido({ id: 'temprano', fechaIso: '2026-11-04T18:00:00Z' })]
    expect(prepararPartidosClubesEuropa(eventos, jugadoresColombianosEuropa, '').map(evento => evento.id)).toEqual(['temprano', 'tarde'])
    expect(eventos.map(evento => evento.id)).toEqual(['tarde', 'temprano'])
  })
})
