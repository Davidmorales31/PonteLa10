import { describe, expect, it } from 'vitest'
import {
  construirRutaPaginaArticulos,
  esPaginaArticulosSinResultados,
  esCategoriaArticulosIndexable,
  leerPaginaArticulosPublica,
  leerPaginaDesdeRutaArticulos,
  limiteArticulosPorPagina
} from '../../utils/paginacionArticulos'

describe('paginación pública de artículos', () => {
  it('acepta páginas enteras canónicas dentro del rango consultable', () => {
    expect(leerPaginaArticulosPublica('1')).toBe(1)
    expect(leerPaginaArticulosPublica('2')).toBe(2)
    expect(leerPaginaArticulosPublica(String(Math.floor(100_000 / limiteArticulosPorPagina) + 1))).toBe(5001)
  })

  it.each([undefined, 2, '0', '01', '-1', '2.0', '5002', '999999999999999999999']) (
    'rechaza el segmento de página no canónico o fuera de rango: %o',
    pagina => expect(leerPaginaArticulosPublica(pagina)).toBeNull()
  )

  it('resuelve solo las rutas del listado público y distingue página 1 de páginas siguientes', () => {
    expect(leerPaginaDesdeRutaArticulos('/articulos')).toBe(1)
    expect(leerPaginaDesdeRutaArticulos('/articulos/pagina/2')).toBe(2)
    expect(leerPaginaDesdeRutaArticulos('/articulos/pagina/2/')).toBe(2)
    expect(leerPaginaDesdeRutaArticulos('/articulos/pagina/01')).toBeNull()
    expect(leerPaginaDesdeRutaArticulos('/articulos/una-noticia')).toBeNull()
  })

  it('solo declara inexistente una página posterior cuando la consulta terminó sin resultados', () => {
    expect(esPaginaArticulosSinResultados(2, 0, 'success')).toBe(true)
    expect(esPaginaArticulosSinResultados(1, 0, 'success')).toBe(false)
    expect(esPaginaArticulosSinResultados(2, 0, 'error')).toBe(false)
    expect(esPaginaArticulosSinResultados(2, 20, 'success')).toBe(false)
  })

  it('construye enlaces rastreables y conserva filtros sin indexar combinaciones de búsqueda', () => {
    expect(construirRutaPaginaArticulos(1)).toBe('/articulos')
    expect(construirRutaPaginaArticulos(2)).toBe('/articulos/pagina/2')
    expect(construirRutaPaginaArticulos(2, {
      categoria: 'futbol-colombiano',
      buscar: 'fútbol femenino',
      tema: 'seleccion-colombia'
    })).toBe('/articulos/pagina/2?categoria=futbol-colombiano&tema=seleccion-colombia&buscar=f%C3%BAtbol+femenino')
  })

  it('solo deja indexables las categorías públicas reconocidas', () => {
    expect(esCategoriaArticulosIndexable('futbol-colombiano')).toBe(true)
    expect(esCategoriaArticulosIndexable('FUTBOL-COLOMBIANO')).toBe(true)
    expect(esCategoriaArticulosIndexable('categoria-inventada')).toBe(false)
    expect(esCategoriaArticulosIndexable(['futbol', 'opinion'])).toBe(false)
  })
})
