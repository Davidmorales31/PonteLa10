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
import { construirHeadSeoPont3la10 } from '../../utils/headSeoPont3la10'

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

  it('genera title, description, canonical, robots, Open Graph y JSON-LD desde un contrato único', () => {
    const head = construirHeadSeoPont3la10('https://www.pont3la10.com', {
      titulo: 'Nacional vs Millonarios: horario, resultado y detalles',
      descripcion: 'Consulta la información verificada del encuentro, su estado y el resultado actualizado.',
      rutaCanonica: '/partidos/nacional-vs-millonarios',
      imagen: '/api/partidos-seo/nacional-vs-millonarios/imagen?formato=og',
      imagenAlt: 'Atlético Nacional vs Millonarios',
      imagenAncho: 1200,
      imagenAlto: 628,
      tipoOpenGraph: 'website',
      datosEstructurados: {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        url: 'https://www.pont3la10.com/partidos/nacional-vs-millonarios'
      }
    })
    const canonical = 'https://www.pont3la10.com/partidos/nacional-vs-millonarios'
    const getMeta = (kind: 'name' | 'property', key: string) =>
      head.meta.find(meta => kind === 'name'
        ? 'name' in meta && meta.name === key
        : 'property' in meta && meta.property === key)?.content

    expect(head.title).toBe('Nacional vs Millonarios: horario, resultado y detalles')
    expect(getMeta('name', 'description')).toContain('información verificada')
    expect(getMeta('name', 'robots')).toContain('index, follow')
    expect(getMeta('property', 'og:title')).toBe(head.title)
    expect(getMeta('property', 'og:description')).toBe(getMeta('name', 'description'))
    expect(getMeta('property', 'og:url')).toBe(canonical)
    expect(head.link.find(link => link.rel === 'canonical')?.href).toBe(canonical)
    expect(getMeta('property', 'og:image:width')).toBe('1200')
    expect(getMeta('property', 'og:image:height')).toBe('628')
    expect(head.script).toHaveLength(1)
    expect(JSON.parse(head.script[0].innerHTML)).toMatchObject({ '@type': 'SportsEvent', url: canonical })
  })

  it('mantiene el noindex y evita anunciar una canonical enlazada en páginas de búsqueda', () => {
    const head = construirHeadSeoPont3la10('https://www.pont3la10.com', {
      titulo: 'Resultados de búsqueda | Pont3la10',
      descripcion: 'Resultados internos de búsqueda.',
      rutaCanonica: '/articulos?buscar=seleccion',
      robots: 'noindex, follow'
    })

    expect(head.meta.find(meta => 'name' in meta && meta.name === 'robots')?.content).toBe('noindex, follow')
    expect(head.link.some(link => link.rel === 'canonical')).toBe(false)
    expect(head.meta.find(meta => 'property' in meta && meta.property === 'og:url')?.content)
      .toBe('https://www.pont3la10.com/articulos?buscar=seleccion')
  })
})
