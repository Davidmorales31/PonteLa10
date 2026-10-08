import { describe, expect, it } from 'vitest'
import {
  alternarSlugJugadorSeguido,
  esSlugJugadorSeguible,
  normalizarSlugsJugadoresSeguidos
} from '~/utils/seguimientoJugadores'

describe('seguimiento de jugadores', () => {
  it('solo acepta jugadores con ficha pública', () => {
    expect(esSlugJugadorSeguible('luis-diaz')).toBe(true)
    expect(esSlugJugadorSeguible('jude-bellingham')).toBe(false)
    expect(esSlugJugadorSeguible('../admin')).toBe(false)
    expect(esSlugJugadorSeguible(null)).toBe(false)
  })

  it('normaliza la preferencia local y elimina duplicados o perfiles inexistentes', () => {
    expect(normalizarSlugsJugadoresSeguidos([
      'luis-diaz', 'luis-diaz', 'davinson-sanchez', 'jude-bellingham', '../admin', null
    ])).toEqual(['luis-diaz', 'davinson-sanchez'])
    expect(normalizarSlugsJugadoresSeguidos('luis-diaz')).toEqual([])
  })

  it('agrega y quita jugadores sin mutar la lista anterior', () => {
    const iniciales = ['luis-diaz']
    expect(alternarSlugJugadorSeguido(iniciales, 'jhon-lucumi')).toEqual(['luis-diaz', 'jhon-lucumi'])
    expect(alternarSlugJugadorSeguido(iniciales, 'luis-diaz')).toEqual([])
    expect(alternarSlugJugadorSeguido(iniciales, 'jude-bellingham')).toEqual(iniciales)
    expect(iniciales).toEqual(['luis-diaz'])
  })
})
