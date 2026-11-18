import { describe, expect, it } from 'vitest'
import { construirPaqueteComunidad, enlaceComunidad } from '../../utils/editorial/paqueteComunidad'

const articulo = {
  id: '07d68459-1f3b-4d8e-b712-00385b2b9770',
  slug: 'america-finalista-copa-betplay',
  titulo: 'América de Cali es finalista de la Copa BetPlay',
  resumen: 'América empató 1-1 con Inter y jugará la final ante Once Caldas.'
}

describe('paquete para YouTube Comunidad y WhatsApp', () => {
  it('enlaza el artículo con UTM propios de cada canal', () => {
    const url = new URL(enlaceComunidad(articulo, 'whatsapp'))
    expect(url.origin + url.pathname).toBe('https://www.pont3la10.com/articulos/america-finalista-copa-betplay')
    expect(url.searchParams.get('utm_source')).toBe('whatsapp')
    expect(url.searchParams.get('utm_medium')).toBe('organic_social')
    expect(url.searchParams.get('utm_campaign')).toBe(`noticia_${articulo.id}`)
    expect(new URL(enlaceComunidad(articulo, 'youtube')).searchParams.get('utm_source')).toBe('youtube')
  })

  it('arma un texto por canal con el titular, el resumen y el enlace', () => {
    const paquete = construirPaqueteComunidad(articulo)
    expect(paquete.youtube.startsWith(articulo.titulo)).toBe(true)
    expect(paquete.youtube).toContain(articulo.resumen)
    expect(paquete.youtube).toContain('utm_source=youtube')
    expect(paquete.whatsapp.startsWith(`*${articulo.titulo}*`)).toBe(true)
    expect(paquete.whatsapp).toContain('utm_source=whatsapp')
  })

  it('recorta resúmenes largos sin cortar palabras y tolera resumen vacío', () => {
    const largo = construirPaqueteComunidad({ ...articulo, resumen: 'palabra '.repeat(80) })
    expect(largo.whatsapp).toContain('…')
    expect(largo.whatsapp.length).toBeLessThan(500)
    const sin = construirPaqueteComunidad({ ...articulo, resumen: null })
    expect(sin.youtube).toBe(`${articulo.titulo}\n\nNota completa: ${enlaceComunidad(articulo, 'youtube')}`)
  })
})
