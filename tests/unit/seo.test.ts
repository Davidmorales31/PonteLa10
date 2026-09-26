import { describe, expect, it } from 'vitest'
import {
  construirTituloMetaConMarca,
  construirUrlAbsoluta,
  evaluarTarjetaSocial,
  escaparXml,
  inferirTipoMimeImagen,
  normalizarUrlSitio,
  normalizarTextoMeta,
  serializarJsonLd
} from '../../utils/seo'

describe('utilidades SEO', () => {
  it('construye canonical absolutas sin barras duplicadas', () => {
    expect(normalizarUrlSitio('https://pont3la10.com///')).toBe('https://pont3la10.com')
    expect(construirUrlAbsoluta('https://pont3la10.com/', '/resultados')).toBe(
      'https://pont3la10.com/resultados'
    )
  })

  it('conserva imagenes externas como URL absolutas', () => {
    expect(construirUrlAbsoluta('https://pont3la10.com', 'https://cdn.example.com/equipo.png')).toBe(
      'https://cdn.example.com/equipo.png'
    )
  })

  it('serializa JSON-LD sin permitir cierres de script', () => {
    const resultado = serializarJsonLd({ nombre: '</script><script>alert(1)</script>' })
    expect(resultado).not.toContain('</script>')
    expect(resultado).toContain('\\u003c/script>')
  })

  it('escapa caracteres reservados del sitemap XML', () => {
    expect(escaparXml('https://pont3la10.com/?a=1&b="dos"')).toBe(
      'https://pont3la10.com/?a=1&amp;b=&quot;dos&quot;'
    )
  })

  it('normaliza metadatos y reserva espacio para la marca', () => {
    const titulo = construirTituloMetaConMarca(
      'Una noticia deportiva con un título deliberadamente largo para validar el recorte seguro'
    )

    expect(titulo).toContain('Pont3la10')
    expect(titulo.length).toBeLessThanOrEqual(70)
    expect(normalizarTextoMeta('Texto\n con   espacios', 50)).toBe('Texto con espacios')
  })

  it('no duplica la marca en el título social', () => {
    expect(construirTituloMetaConMarca('Especial Pont3la10')).toBe('Especial Pont3la10')
  })

  it('infiere el tipo de imagen aunque la URL tenga parámetros', () => {
    expect(inferirTipoMimeImagen('https://cdn.test/portada.webp?version=2')).toBe('image/webp')
    expect(inferirTipoMimeImagen('https://cdn.test/portada.JPEG')).toBe('image/jpeg')
  })

  it('detecta una tarjeta social completa', () => {
    const comprobaciones = evaluarTarjetaSocial({
      titulo: 'Una noticia completa y clara para compartir en todas las redes',
      descripcion: 'Este resumen entrega el contexto suficiente para comprender la noticia antes de abrir el enlace completo.',
      tieneImagen: true,
      textoAlternativo: 'Jugadores celebran en el estadio.',
      anchoImagen: 1200,
      altoImagen: 630
    })

    expect(comprobaciones.every(item => item.estado === 'correcto')).toBe(true)
  })

  it('permite publicar una tarjeta sin portada con advertencia, no error', () => {
    const comprobaciones = evaluarTarjetaSocial({
      titulo: 'Título corto',
      descripcion: 'Resumen corto.',
      tieneImagen: false
    })

    expect(comprobaciones.find(item => item.id === 'imagen')?.estado).toBe('advertencia')
    expect(comprobaciones.find(item => item.id === 'imagen')?.mensaje).toContain('sin imagen')
  })
})
