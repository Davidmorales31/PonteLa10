import { describe, expect, it } from 'vitest'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import {
  crearUrlCompartirArticulo,
  seleccionarArticulosRelacionados
} from '~/utils/editorial/distribucion'

function crearArticulo(
  id: string,
  categoria: string,
  publicadoEn: string
): ResumenArticuloPublico {
  return {
    id,
    slug: `noticia-${id}`,
    titulo: `Noticia publicada ${id}`,
    resumen: 'Resumen editorial.',
    tipo: 'noticia',
    publicadoEn,
    autorNombre: 'Equipo Pont3la10',
    categoria,
    imagen: ''
  }
}

describe('distribución de artículos', () => {
  it('construye enlaces de compartir codificados', () => {
    const url = crearUrlCompartirArticulo(
      'whatsapp',
      'https://pont3la10.com/articulos/noticia',
      'Título con espacios'
    )

    expect(url).toContain('api.whatsapp.com/send')
    expect(url).toContain('T%C3%ADtulo%20con%20espacios')
    expect(url).toContain('https%3A%2F%2Fpont3la10.com')
  })

  it('prioriza la categoría actual y excluye el artículo abierto', () => {
    const articulos = [
      crearArticulo('actual', 'Tendencias', '2026-08-02T10:00:00Z'),
      crearArticulo('otra', 'Fútbol mundial', '2026-08-02T12:00:00Z'),
      crearArticulo('misma-antigua', 'Tendencias', '2026-08-01T10:00:00Z'),
      crearArticulo('misma-reciente', 'Tendencias', '2026-08-02T11:00:00Z')
    ]

    expect(seleccionarArticulosRelacionados(
      articulos,
      'actual',
      'Tendencias',
      3
    ).map(articulo => articulo.id)).toEqual([
      'misma-reciente',
      'misma-antigua',
      'otra'
    ])
  })
})
