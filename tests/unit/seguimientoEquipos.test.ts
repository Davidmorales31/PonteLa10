import { describe, expect, it } from 'vitest'
import {
  MAX_EQUIPOS_SEGUIDOS,
  alternarSlugEquipoSeguido,
  esSlugEquipoSeguible,
  leerSlugsEquiposSeguidos,
  normalizarSlugsEquiposSeguidos
} from '~/utils/seguimientoEquipos'

describe('seguimiento de equipos', () => {
  it('solo conserva slugs válidos y elimina duplicados del almacenamiento', () => {
    expect(normalizarSlugsEquiposSeguidos([
      'atletico-nacional', 'atletico-nacional', 'Millonarios', null, '../admin', 'america-de-cali'
    ])).toEqual(['atletico-nacional', 'america-de-cali'])
    expect(normalizarSlugsEquiposSeguidos('atletico-nacional')).toEqual([])
  })

  it('agrega y elimina equipos sin mutar el arreglo recibido', () => {
    const iniciales = ['atletico-nacional']
    expect(alternarSlugEquipoSeguido(iniciales, 'america-de-cali'))
      .toEqual(['atletico-nacional', 'america-de-cali'])
    expect(alternarSlugEquipoSeguido(iniciales, 'atletico-nacional'))
      .toEqual([])
    expect(iniciales).toEqual(['atletico-nacional'])
  })

  it('no acepta slugs manipulados ni supera el máximo local', () => {
    expect(esSlugEquipoSeguible('../atletico-nacional')).toBe(false)
    expect(esSlugEquipoSeguible('águilas-doradas')).toBe(false)
    const slugs = Array.from({ length: MAX_EQUIPOS_SEGUIDOS }, (_, indice) => `equipo-${indice + 1}`)
    expect(alternarSlugEquipoSeguido(slugs, 'nuevo-equipo')).toEqual(slugs)
  })

  it('valida la lista de equipos que consume el endpoint de portada', () => {
    expect(leerSlugsEquiposSeguidos('atletico-nacional,america-de-cali'))
      .toEqual(['atletico-nacional', 'america-de-cali'])
    expect(leerSlugsEquiposSeguidos('../admin')).toBeNull()
    expect(leerSlugsEquiposSeguidos('')).toBeNull()
    expect(leerSlugsEquiposSeguidos('equipo,'.repeat(MAX_EQUIPOS_SEGUIDOS))).toBeNull()
  })
})
