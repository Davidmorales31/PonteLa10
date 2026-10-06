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

  it('solo indexa fichas de equipo con escudo, clasificación verificada y tres partidos', () => {
    const equipo = {
      tipo: 'equipo' as const,
      slug: 'atletico-nacional',
      nombre: 'Atlético Nacional',
      competencia: 'liga-betplay',
      temporada: '2026-II',
      escudo: '/images/escudos/liga-colombiana/atletico-nacional.png',
      posicionVerificadaEn: '2026-10-06T12:00:00.000Z',
      partidosPublicos: 3
    }
    expect(evaluarIndexabilidad(equipo)).toBe(true)
    expect(evaluarIndexabilidad({ ...equipo, escudo: null })).toBe(false)
    expect(evaluarIndexabilidad({ ...equipo, posicionVerificadaEn: null })).toBe(false)
    expect(evaluarIndexabilidad({ ...equipo, partidosPublicos: 2 })).toBe(false)
  })

  it('indexa competiciones solo con temporada válida, ocho partidos y seis equipos públicos', () => {
    const competicion = {
      tipo: 'competicion' as const,
      slug: 'liga-betplay',
      nombre: 'Liga BetPlay',
      temporada: '2026-II',
      partidosPublicos: 8,
      equiposPublicos: 6,
      fuenteDisponible: true
    }
    expect(evaluarIndexabilidad(competicion)).toBe(true)
    expect(evaluarIndexabilidad({ ...competicion, partidosPublicos: 7 })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, equiposPublicos: 5 })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, temporada: 'no-valida' })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, fuenteDisponible: false })).toBe(false)
  })
})
