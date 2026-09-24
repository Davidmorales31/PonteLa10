import { describe, expect, it } from 'vitest'
import { categoriasSitio, navegacionMasSitio, navegacionSitio } from '../../data/sitioPublico'
import {
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
    expect(obtenerEtiquetaCategoria('futbol-colombiano')).toBe('fútbol colombiano')
  })
})
