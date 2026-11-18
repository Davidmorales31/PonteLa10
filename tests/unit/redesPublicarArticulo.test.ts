import { describe, expect, it } from 'vitest'
import { construirComposicionArticulo, resaltarFinal } from '../../scripts/redes-publicar-articulo.mjs'

const articulo = {
  id: '07d68459-1f3b-4d8e-b712-00385b2b9770',
  slug: 'america-finalista-copa-betplay',
  titulo: 'América de Cali es finalista de la Copa BetPlay tras empatar 1-1 con Inter',
  tituloPortada: 'América sufrió hasta el 87 y jugará la final de la Copa',
  resumen: 'América empató 1-1 con Inter y jugará la final ante Once Caldas.'
}
const medioId = '11111111-1111-4111-8111-111111111111'

describe('publicación social de un artículo', () => {
  it('resalta las dos últimas palabras del titular', () => {
    expect(resaltarFinal('América sufrió hasta el 87 y jugará la final de la Copa')).toBe('América sufrió hasta el 87 y jugará la final de **la Copa**')
    expect(resaltarFinal('Gol agónico')).toBe('Gol agónico')
  })

  it('arma una composición vertical con foto, logo y titular sobre degradado', () => {
    const composicion = construirComposicionArticulo(articulo, medioId, 'Colprensa (vía El Colombiano)')
    expect(composicion.tipo).toBe('imagenes')
    expect(composicion.formato).toBe('vertical')
    expect(composicion.destinos).toEqual(['facebook', 'instagram'])
    expect(composicion.diapositivas).toHaveLength(1)
    const [diapositiva] = composicion.diapositivas
    expect(diapositiva.plantilla).toBe('una')
    expect(diapositiva.imagenes).toEqual([{ medioId }])
    expect(diapositiva.logos).toHaveLength(1)
    expect(diapositiva.textos[0]).toMatchObject({ fondo: 'degradado', color: 'blanco' })
    expect(diapositiva.textos[0].texto).toContain('**')
    expect(diapositiva.textos[0].texto.replace(/\*/g, '')).toBe(articulo.tituloPortada)
  })

  it('acredita la foto, enlaza el artículo y usa una clave idempotente estable', () => {
    const composicion = construirComposicionArticulo(articulo, medioId, 'Colprensa (vía El Colombiano)')
    expect(composicion.descripcion.facebook).toContain('Foto: Colprensa (vía El Colombiano)')
    expect(composicion.descripcion.facebook).toContain('https://www.pont3la10.com/articulos/america-finalista-copa-betplay')
    expect(composicion.descripcion.instagram.length).toBeLessThanOrEqual(2200)
    expect(composicion.claveIdempotencia).toBe(`articulo-${articulo.id}`)
    expect(composicion.claveIdempotencia).toMatch(/^[A-Za-z0-9_.:-]{8,100}$/)
    expect(composicion.titulo.length).toBeLessThanOrEqual(120)
  })

  it('rechaza un artículo sin titular o sin imagen', () => {
    expect(() => construirComposicionArticulo({ ...articulo, titulo: '', tituloPortada: '' }, medioId, 'x')).toThrow()
    expect(() => construirComposicionArticulo(articulo, '', 'x')).toThrow()
  })
})
