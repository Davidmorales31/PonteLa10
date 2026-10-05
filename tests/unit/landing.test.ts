import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { categoriasSitio, navegacionMasSitio, navegacionSitio } from '../../data/sitioPublico'
import {
  aumentarNoticiasVisibles,
  combinarArticulosPublicos,
  normalizarTextoBusqueda,
  obtenerAliasCategoria,
  obtenerEtiquetaCategoria
} from '../../utils/articulosLanding'

describe('configuración de la landing', () => {
  it('usa rutas internas para las acciones principales', () => {
    const rutas = [
      ...navegacionSitio.map(item => item.ruta),
      ...navegacionMasSitio.map(item => item.ruta),
      ...categoriasSitio.map(categoria => categoria.ruta)
    ]

    expect(rutas.every(ruta => ruta.startsWith('/'))).toBe(true)
  })

  it('normaliza tildes y mayúsculas para filtros', () => {
    expect(normalizarTextoBusqueda('  FÚTBOL Colombiano  ')).toBe('futbol colombiano')
    expect(obtenerAliasCategoria('tecnologia')).toContain('tech deportiva')
    expect(obtenerAliasCategoria('futbol-colombiano')).toContain('liga betplay')
    expect(obtenerAliasCategoria('futbol-colombiano')).toContain('copa colombia')
    expect(obtenerEtiquetaCategoria('futbol-colombiano')).toBe('fútbol colombiano')
  })

  it('combina páginas de noticias sin repetir slugs', () => {
    const existentes = [{ slug: 'primera', titulo: 'Primera' }]
    const nuevos = [
      { slug: 'primera', titulo: 'Duplicada' },
      { slug: 'segunda', titulo: 'Segunda' }
    ]

    expect(combinarArticulosPublicos(existentes, nuevos)).toEqual([
      { slug: 'primera', titulo: 'Primera' },
      { slug: 'segunda', titulo: 'Segunda' }
    ])
  })

  it('muestra el siguiente bloque sin superar la cantidad disponible', () => {
    expect(aumentarNoticiasVisibles(6, 20)).toBe(12)
    expect(aumentarNoticiasVisibles(18, 20)).toBe(20)
    expect(aumentarNoticiasVisibles(6, 4)).toBe(4)
  })

  it('aplica colores claros al buscador cuando el tema blanco está activo', () => {
    const estilos = readFileSync(new URL('../../assets/css/landing.css', import.meta.url), 'utf8')

    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing')
    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing input')
    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing input::placeholder')
    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing input:focus')
  })
})
