import { describe, expect, it } from 'vitest'
import { jugadoresColombianosEuropa, partidoCorrespondeAClubJugador } from '../../data/jugadoresColombianosEuropa'
import { evaluarIndexabilidad } from '../../utils/indexabilidadPublica'

describe('perfiles públicos de futbolistas colombianos en Europa', () => {
  const ahora = Date.parse('2026-10-20T20:00:00.000Z')

  it('conserva los 14 perfiles y solo indexa los que cumplen calidad y fuente oficial', () => {
    expect(jugadoresColombianosEuropa.map(perfil => perfil.slug)).toEqual([
      'luis-diaz', 'jhon-lucumi', 'davinson-sanchez', 'jhon-cordoba',
      'linda-caicedo', 'jhon-duran', 'camilo-duran', 'cucho-hernandez',
      'nelson-deossa', 'gustavo-puerta', 'yaser-asprilla', 'jhon-solis',
      'royer-caicedo', 'luis-suarez'
    ])
    expect(jugadoresColombianosEuropa
      .filter(perfil => evaluarIndexabilidad({ tipo: 'jugador', ...perfil }, ahora))
      .map(perfil => perfil.slug))
      .toEqual(['luis-diaz', 'jhon-lucumi', 'davinson-sanchez'])
  })

  it('mantiene noindex ante identidad incompleta, fuente no oficial o verificación vencida', () => {
    const jugador = jugadoresColombianosEuropa[0]!
    const datos = { tipo: 'jugador' as const, ...jugador }
    expect(evaluarIndexabilidad({ ...datos, club: '' }, ahora)).toBe(false)
    expect(evaluarIndexabilidad({ ...datos, nacionalidad: 'Desconocida' }, ahora)).toBe(false)
    expect(evaluarIndexabilidad({ ...datos, fuenteOficialUrl: 'https://noticias.example/jugador' }, ahora)).toBe(false)
    expect(evaluarIndexabilidad({ ...datos, verificadoEn: '2026-06-01T00:00:00.000Z' }, ahora)).toBe(false)
    expect(evaluarIndexabilidad({ ...datos, verificadoEn: '2026-10-21T00:00:00.000Z' }, ahora)).toBe(false)
    expect(evaluarIndexabilidad({ ...datos, descripcionVerificada: 'Texto muy corto.' }, ahora)).toBe(false)
  })

  it('asocia los partidos solo con alias del club y normaliza tildes', () => {
    const luis = jugadoresColombianosEuropa[0]!
    expect(partidoCorrespondeAClubJugador({
      equipoLocal: { nombre: 'FC Bayern München' }, equipoVisitante: { nombre: 'FC Augsburg' }
    }, luis)).toBe(true)
    expect(partidoCorrespondeAClubJugador({
      equipoLocal: { nombre: 'Bayern Munich' }, equipoVisitante: { nombre: 'FC Augsburg' }
    }, luis)).toBe(true)
    expect(partidoCorrespondeAClubJugador({
      equipoLocal: { nombre: 'Bayern Leverkusen' }, equipoVisitante: { nombre: 'FC Augsburg' }
    }, luis)).toBe(false)
  })
})
