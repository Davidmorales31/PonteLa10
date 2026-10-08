import { describe, expect, it } from 'vitest'
import { evaluarIndexabilidad } from '../../utils/indexabilidadPublica'

const ahora = Date.now()
const partidoValido = {
  local: 'Atlético Nacional',
  visitante: 'Millonarios',
  competencia: 'liga-betplay',
  fechaIso: new Date(ahora + 6 * 60 * 60_000).toISOString(),
  estado: 'scheduled',
  verificadoEn: new Date(ahora - 10 * 60_000).toISOString(),
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
    expect(evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: 0, entidadesVerificadas: 3, fuenteDisponible: true })).toBe(true)
    expect(evaluarIndexabilidad({ tipo: 'hub', articulosDisponibles: 0, entidadesVerificadas: 2, fuenteDisponible: true })).toBe(false)
  })

  it('solo indexa fichas de equipo con escudo, clasificación verificada y tres partidos', () => {
    const equipo = {
      tipo: 'equipo' as const,
      slug: 'atletico-nacional',
      nombre: 'Atlético Nacional',
      competencia: 'liga-betplay',
      temporada: '2026-II',
      escudo: '/images/escudos/liga-colombiana/atletico-nacional.png',
      posicionVerificadaEn: new Date(ahora - 30 * 60_000).toISOString(),
      partidosPublicos: 3
    }
    expect(evaluarIndexabilidad(equipo)).toBe(true)
    expect(evaluarIndexabilidad({ ...equipo, escudo: null })).toBe(false)
    expect(evaluarIndexabilidad({ ...equipo, posicionVerificadaEn: null })).toBe(false)
    expect(evaluarIndexabilidad({ ...equipo, posicionVerificadaEn: new Date(ahora - 61 * 60_000).toISOString() }, ahora)).toBe(false)
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
      fuenteDisponible: true,
      datosActualizados: true
    }
    expect(evaluarIndexabilidad(competicion)).toBe(true)
    expect(evaluarIndexabilidad({ ...competicion, partidosPublicos: 7 })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, equiposPublicos: 5 })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, temporada: 'no-valida' })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, fuenteDisponible: false })).toBe(false)
    expect(evaluarIndexabilidad({ ...competicion, datosActualizados: false })).toBe(false)
  })

  it('evita indexar partidos sin verificación reciente o con fecha de consulta faltante', () => {
    expect(evaluarIndexabilidad({
      ...partidoValido,
      fechaIso: new Date(ahora + 30 * 60_000).toISOString(),
      verificadoEn: new Date(ahora - 31 * 60_000).toISOString()
    }, ahora)).toBe(false)
    expect(evaluarIndexabilidad({
      ...partidoValido,
      verificadoEn: '',
      fechaIso: new Date(ahora + 30 * 60_000).toISOString()
    }, ahora)).toBe(false)
  })
})
