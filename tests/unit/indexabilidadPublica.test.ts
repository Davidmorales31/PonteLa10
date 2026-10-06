import { describe, expect, it } from 'vitest'
import { evaluarIndexabilidad } from '../../utils/indexabilidadPublica'

const partidoValido = {
  local: 'Atlético Nacional',
  visitante: 'Millonarios',
  competencia: 'liga-betplay',
  fechaIso: '2026-10-06T23:00:00.000Z',
  estado: 'scheduled',
  fuenteOficialUrl: 'https://dimayor.com.co/programacion',
  golesLocal: null,
  golesVisitante: null,
  estadio: 'Atanasio Girardot'
}

describe('indexabilidad de fichas de partido', () => {
  it('permite indexar solo fichas completas respaldadas por fuente y contexto', () => {
    expect(evaluarIndexabilidad(partidoValido)).toBe(true)
    expect(evaluarIndexabilidad({
      ...partidoValido,
      estadio: null,
      golesLocal: 2,
      golesVisitante: 1
    })).toBe(true)
    expect(evaluarIndexabilidad({
      ...partidoValido,
      fuenteOficialUrl: null,
      estadio: null,
      transmisionVerificada: true
    })).toBe(true)
  })

  it('excluye partidos con estado pendiente, datos incompletos o sin contexto', () => {
    expect(evaluarIndexabilidad({ ...partidoValido, estado: 'actualizacion_pendiente' })).toBe(false)
    expect(evaluarIndexabilidad({ ...partidoValido, fuenteOficialUrl: null })).toBe(false)
    expect(evaluarIndexabilidad({ ...partidoValido, fuenteOficialUrl: 'https://sitio-falso.example/programacion' })).toBe(false)
    expect(evaluarIndexabilidad({ ...partidoValido, estadio: null })).toBe(false)
    expect(evaluarIndexabilidad({ ...partidoValido, visitante: '' })).toBe(false)
  })

  it('solo indexa hubs cuando la fuente responde y hay contenido suficiente', () => {
    expect(evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: 3, fuenteDisponible: true })).toBe(true)
    expect(evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: 2, fuenteDisponible: true })).toBe(false)
    expect(evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: 24, fuenteDisponible: false })).toBe(false)
  })
})
