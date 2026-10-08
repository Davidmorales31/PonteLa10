import { describe, expect, it } from 'vitest'
import {
  alternarSlugCompeticionSeguida,
  crearResumenCompeticionSeguida,
  esSlugCompeticionSeguible,
  normalizarSlugsCompeticionesSeguidas
} from '~/utils/seguimientoCompeticiones'

describe('seguimiento de competiciones', () => {
  it('solo permite competiciones con cobertura pública', () => {
    expect(esSlugCompeticionSeguible('liga-betplay')).toBe(true)
    expect(esSlugCompeticionSeguible('torneo-betplay')).toBe(true)
    expect(esSlugCompeticionSeguible('copa-colombia')).toBe(true)
    expect(esSlugCompeticionSeguible('champions-league')).toBe(false)
    expect(esSlugCompeticionSeguible('../admin')).toBe(false)
    expect(esSlugCompeticionSeguible(null)).toBe(false)
  })

  it('normaliza preferencias locales y descarta duplicados y valores no admitidos', () => {
    expect(normalizarSlugsCompeticionesSeguidas([
      'liga-betplay', 'liga-betplay', 'copa-colombia', 'champions-league', '../admin', null
    ])).toEqual(['liga-betplay', 'copa-colombia'])
    expect(normalizarSlugsCompeticionesSeguidas('liga-betplay')).toEqual([])
  })

  it('agrega o quita competiciones sin mutar la lista recibida', () => {
    const iniciales = ['liga-betplay']
    expect(alternarSlugCompeticionSeguida(iniciales, 'copa-colombia')).toEqual(['liga-betplay', 'copa-colombia'])
    expect(alternarSlugCompeticionSeguida(iniciales, 'liga-betplay')).toEqual([])
    expect(alternarSlugCompeticionSeguida(iniciales, 'champions-league')).toEqual(['liga-betplay'])
    expect(iniciales).toEqual(['liga-betplay'])
  })

  it('resume datos públicos de partidos y rechaza respuestas de otra competición', () => {
    const ficha = {
      competencia: { slug: 'liga-betplay', nombre: 'Nombre no confiable' },
      partidosEnVivo: [{
        slug: 'america-vs-cali', local: 'América', visitante: 'Cali',
        fechaIso: '2026-10-08T23:00:00.000Z', golesLocal: 2, golesVisitante: 1
      }],
      proximosPartidos: [],
      resultadosRecientes: []
    }

    expect(crearResumenCompeticionSeguida('liga-betplay', ficha)).toEqual({
      slug: 'liga-betplay',
      nombre: 'Liga BetPlay',
      partidoEnVivo: {
        slug: 'america-vs-cali', local: 'América', visitante: 'Cali',
        fechaIso: '2026-10-08T23:00:00.000Z', golesLocal: 2, golesVisitante: 1
      },
      proximoPartido: null,
      resultadoReciente: null,
      error: false
    })
    expect(crearResumenCompeticionSeguida('copa-colombia', ficha)).toBeNull()
    expect(crearResumenCompeticionSeguida('../admin', ficha)).toBeNull()
  })
})
