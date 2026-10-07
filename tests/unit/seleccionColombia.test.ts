import { describe, expect, it } from 'vitest'
import {
  calendarioOficialSeleccion,
  convocatoriasOficialesSeleccion,
  fechaVerificacionSeleccion,
  resultadosOficialesSeleccion
} from '../../data/seleccionColombia2026'
import type { PartidoResultado } from '../../types/resultados'
import {
  contarContenidoSeleccionVerificado,
  encontrarPartidoRegistradoSeleccion,
  esEquipoSeleccionColombia,
  filtrarPartidosSeleccionColombia,
  obtenerFechaColombia
} from '../../utils/seleccionColombia'

function partido(overrides: Partial<PartidoResultado> = {}): PartidoResultado {
  return {
    id: 'fixture-1',
    deporte: 'futbol',
    competencia: 'Amistoso internacional',
    fechaIso: '2026-10-06T18:45:00-05:00',
    estado: 'programado',
    equipoLocal: { id: 'col', nombre: 'Colombia', nombreCorto: 'COL' },
    equipoVisitante: { id: 'per', nombre: 'Perú', nombreCorto: 'PER' },
    ...overrides
  }
}

describe('hub de Selección Colombia', () => {
  it('reconoce nombres de selecciones y no confunde clubes colombianos con Colombia', () => {
    expect(esEquipoSeleccionColombia('Colombia')).toBe(true)
    expect(esEquipoSeleccionColombia('Selección Colombia Femenina')).toBe(true)
    expect(esEquipoSeleccionColombia('Colombia Sub-20')).toBe(true)
    expect(esEquipoSeleccionColombia('Atlético Nacional')).toBe(false)
    expect(esEquipoSeleccionColombia('Deportivo Cali')).toBe(false)
  })

  it('filtra el feed público para mostrar partidos de selecciones de Colombia', () => {
    const partidos = [
      partido(),
      partido({
        id: 'club-1',
        equipoLocal: { id: 'nacional', nombre: 'Atlético Nacional', nombreCorto: 'NAC' },
        equipoVisitante: { id: 'junior', nombre: 'Junior', nombreCorto: 'JUN' }
      })
    ]

    expect(filtrarPartidosSeleccionColombia(partidos).map(resultado => resultado.id)).toEqual(['fixture-1'])
  })

  it('enlaza la agenda oficial con el fixture del proveedor por fecha y equipos, no por apodo', () => {
    const fixture = partido()
    const encontrado = encontrarPartidoRegistradoSeleccion(
      { fecha: '2026-10-06', local: 'Colombia', visitante: 'Perú' },
      [fixture]
    )

    expect(encontrado?.id).toBe('fixture-1')
    expect(encontrarPartidoRegistradoSeleccion(
      { fecha: '2026-10-07', local: 'Colombia', visitante: 'Perú' },
      [fixture]
    )).toBeUndefined()
  })

  it('conserva fuentes oficiales, marcador corroborado y la sustitución de la convocatoria femenina', () => {
    expect(fechaVerificacionSeleccion).toBe('2026-10-06')
    expect(resultadosOficialesSeleccion.map(resultado => [
      resultado.local,
      resultado.marcadorLocal,
      resultado.marcadorVisitante,
      resultado.visitante
    ])).toEqual([
      ['México', 1, 1, 'Colombia'],
      ['Colombia', 0, 1, 'Paraguay']
    ])
    expect(resultadosOficialesSeleccion.every(resultado => resultado.fuenteUrl.startsWith('https://fcf.com.co/'))).toBe(true)

    const femenina = convocatoriasOficialesSeleccion.find(convocatoria => convocatoria.id === 'femenina')!
    expect(femenina.jugadores).toHaveLength(23)
    expect(femenina.jugadores.some(jugador => jugador.nombre === 'Sara Sofía Martínez')).toBe(true)
    expect(femenina.jugadores.some(jugador => jugador.nombre === 'Ilana Izquierdo')).toBe(false)
    expect(femenina.actualizacionUrl).toContain('fcf.com.co')
  })

  it('mantiene una agenda 2026 con fuentes FCF y marca sin hora las fechas no confirmadas', () => {
    expect(calendarioOficialSeleccion.some(partido => partido.fecha === '2026-10-10' && partido.hora === null)).toBe(true)
    expect(calendarioOficialSeleccion.every(partido => partido.fuenteUrl.includes('fcf.com.co'))).toBe(true)
    expect(convocatoriasOficialesSeleccion.every(convocatoria => convocatoria.jugadores.length === convocatoria.cantidad)).toBe(true)
  })

  it('indexa con suficientes datos oficiales recientes y deja de hacerlo cuando quedan desactualizados', () => {
    expect(contarContenidoSeleccionVerificado('2026-10-06')).toBeGreaterThanOrEqual(3)
    expect(contarContenidoSeleccionVerificado('2026-11-21')).toBeGreaterThanOrEqual(3)
    expect(contarContenidoSeleccionVerificado('2026-12-15')).toBe(0)
    expect(obtenerFechaColombia(new Date('2026-10-07T04:30:00.000Z'))).toBe('2026-10-06')
  })
})
