import { describe, expect, it } from 'vitest'
import { esResumenArticuloPublico } from '~/utils/articulosPublicos'

const articuloValido = {
  id: 'articulo-1',
  slug: 'noticia-de-prueba',
  titulo: 'Noticia de prueba',
  resumen: 'Resumen',
  tipo: 'noticia',
  publicadoEn: '2026-10-07T12:00:00.000Z',
  autorNombre: 'Redacción',
  categoria: 'Fútbol colombiano',
  imagen: '',
  lecturaMinutos: 2
}

describe('validación de resúmenes públicos de artículos', () => {
  it('acepta un artículo con los campos públicos que necesita la portada', () => {
    expect(esResumenArticuloPublico(articuloValido)).toBe(true)
  })

  it('acepta dimensiones responsivas opcionales y rechaza anchos inválidos', () => {
    expect(esResumenArticuloPublico({ ...articuloValido, imagenAncho: 1200 })).toBe(true)
    expect(esResumenArticuloPublico({ ...articuloValido, imagenAncho: 0 })).toBe(false)
    expect(esResumenArticuloPublico({ ...articuloValido, imagenAncho: 2501 })).toBe(false)
  })

  it('rechaza el cuerpo de error de un endpoint y no lo expone como destacado', () => {
    expect(esResumenArticuloPublico({
      error: true,
      statusCode: 503,
      message: 'La autenticación no está configurada.'
    })).toBe(false)
  })

  it('rechaza fechas inválidas para no provocar Invalid time value en SSR', () => {
    expect(esResumenArticuloPublico({ ...articuloValido, publicadoEn: 'fecha inválida' })).toBe(false)
  })
})
