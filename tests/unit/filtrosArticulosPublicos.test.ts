import { describe, expect, it } from 'vitest'
import { analizarConsultaArticulosPublicos } from '../../server/utils/filtrosArticulosPublicos'

describe('filtros de artículos públicos', () => {
  it('limita noticias por tema exacto y conserva la paginación validada', () => {
    expect(analizarConsultaArticulosPublicos({
      tema: 'colombianos-en-europa',
      limite: '24',
      desplazamiento: '48'
    })).toEqual({
      paginado: true,
      limite: 24,
      desplazamiento: 48,
      categoria: null,
      terminosCategoria: [],
      tema: 'colombianos-en-europa',
      buscar: null
    })
  })

  it('filtra fútbol colombiano por su categoría primaria, sin aliases semánticos', () => {
    expect(analizarConsultaArticulosPublicos({ categoria: 'futbol-colombiano' })?.terminosCategoria).toEqual([])
    expect(analizarConsultaArticulosPublicos({ categoria: 'futbol-mundial' })?.terminosCategoria).toEqual([
      'futbol mundial',
      'mundial 2026'
    ])
  })

  it('rechaza parámetros no válidos y limita el tamaño máximo de página', () => {
    expect(analizarConsultaArticulosPublicos({ tema: 'tema con espacios' })).toBeNull()
    expect(analizarConsultaArticulosPublicos({ limite: '-1' })).toBeNull()
    expect(analizarConsultaArticulosPublicos({ limite: '50', paginado: 'true' })?.limite).toBe(49)
  })
})
