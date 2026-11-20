import { describe, expect, it } from 'vitest'
import {
  crearAutorEstructurado,
  filtrarArticulosDeAutor,
  obtenerPerfilAutorPorSlug,
  obtenerPerfilAutorPublico
} from '~/utils/perfilesAutoresPublicos'

const articulo = (autorNombre: string, slug: string) => ({
  id: slug,
  slug,
  titulo: `Título ${slug}`,
  resumen: 'Resumen público',
  tipo: 'noticia' as const,
  publicadoEn: '2026-10-07T12:00:00.000Z',
  autorNombre,
  categoria: 'Fútbol colombiano',
  imagen: ''
})

describe('perfiles públicos de autor', () => {
  it('publica el perfil organizacional permitido y no inventa perfiles personales', () => {
    const perfil = obtenerPerfilAutorPorSlug('equipo-pont3la10')
    expect(perfil).toMatchObject({
      nombre: 'Equipo Ponte la 10',
      tipo: 'Organization',
      slug: 'equipo-pont3la10',
      redesProfesionales: []
    })
    expect(obtenerPerfilAutorPublico('  equipo   ponte la 10 ')).toEqual(perfil)
    expect(obtenerPerfilAutorPorSlug('juan-david-morales')).toBeNull()
    expect(obtenerPerfilAutorPublico('Nombre de usuario sin perfil')).toBeNull()
  })

  it('limita el archivo a artículos cuyo nombre público coincide con el perfil', () => {
    const perfil = obtenerPerfilAutorPorSlug('equipo-pont3la10')!
    const resultado = filtrarArticulosDeAutor([
      articulo('Equipo Ponte la 10', 'articulo-equipo'),
      articulo('Otro autor', 'articulo-otro'),
      articulo('  EQUIPO   PONTE LA 10 ', 'articulo-equipo-normalizado')
    ], perfil)

    expect(resultado.map(item => item.slug)).toEqual([
      'articulo-equipo',
      'articulo-equipo-normalizado'
    ])
  })

  it('enlaza el autor organizacional en NewsArticle y no inventa perfiles de persona', () => {
    expect(crearAutorEstructurado('Equipo Ponte la 10', 'https://www.pont3la10.com/')).toEqual({
      '@type': 'Organization',
      '@id': 'https://www.pont3la10.com/autores/equipo-pont3la10#autor',
      name: 'Equipo Ponte la 10',
      url: 'https://www.pont3la10.com/autores/equipo-pont3la10'
    })
    expect(crearAutorEstructurado('Autora sin ficha publicada', 'https://www.pont3la10.com')).toEqual({
      '@type': 'Person',
      name: 'Autora sin ficha publicada',
      '@id': undefined,
      url: undefined
    })
  })
})
