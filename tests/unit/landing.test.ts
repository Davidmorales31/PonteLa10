import { describe, expect, it } from 'vitest'
import {
  articuloDestacadoLanding,
  articulosRecientesLanding,
  articulosTechLanding,
  categoriasLanding,
  especialesLanding,
  heroLanding,
  navegacionLanding
} from '../../data/landing.mock'
import {
  normalizarTextoBusqueda,
  obtenerAliasCategoria,
  obtenerEtiquetaCategoria
} from '../../utils/articulosLanding'

describe('configuración de la landing', () => {
  it('mantiene identificadores editoriales únicos', () => {
    const slugs = [articuloDestacadoLanding.slug, ...articulosRecientesLanding.map(articulo => articulo.slug)]
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('usa rutas internas para las acciones principales', () => {
    const rutas = [
      ...navegacionLanding.map(item => item.ruta),
      heroLanding.accionPrincipal.ruta,
      heroLanding.accionSecundaria.ruta,
      ...categoriasLanding.map(categoria => categoria.ruta),
      ...especialesLanding.map(especial => especial.accion.ruta),
      ...articulosTechLanding.map(articulo => articulo.ruta)
    ]

    expect(rutas.every(ruta => ruta.startsWith('/'))).toBe(true)
  })

  it('conserva fuentes externas seguras cuando existen', () => {
    const fuentes = [articuloDestacadoLanding, ...articulosRecientesLanding]
      .map(articulo => articulo.fuenteUrl)
      .filter(Boolean)

    expect(fuentes.length).toBeGreaterThan(0)
    expect(fuentes.every(fuente => fuente?.startsWith('https://'))).toBe(true)
  })

  it('normaliza tildes y mayúsculas para filtros', () => {
    expect(normalizarTextoBusqueda('  FÚTBOL Colombiano  ')).toBe('futbol colombiano')
    expect(obtenerAliasCategoria('tecnologia')).toContain('tech deportiva')
    expect(obtenerEtiquetaCategoria('futbol-colombiano')).toBe('fútbol colombiano')
  })
})
