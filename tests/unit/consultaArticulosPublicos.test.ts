import { describe, expect, it } from 'vitest'
import { construirConsultaArticulosPublicos } from '../../utils/consultaArticulosPublicos'

describe('consulta de artículos públicos', () => {
  it('envía los filtros SSR validados junto con cada página', () => {
    expect(construirConsultaArticulosPublicos({
      categoria: 'futbol-colombiano',
      tema: 'liga-betplay',
      buscar: '  Atlético Nacional  '
    }, 20)).toEqual({
      paginado: 'true',
      limite: 20,
      desplazamiento: 20,
      categoria: 'futbol-colombiano',
      tema: 'liga-betplay',
      buscar: 'Atlético Nacional'
    })
  })

  it('ignora parámetros múltiples o slugs malformados y acota la búsqueda', () => {
    expect(construirConsultaArticulosPublicos({
      categoria: ['gaming'],
      tema: 'liga betplay',
      buscar: 'x'.repeat(140)
    })).toEqual({
      paginado: 'true',
      limite: 20,
      desplazamiento: 0,
      buscar: 'x'.repeat(120)
    })
  })
})
