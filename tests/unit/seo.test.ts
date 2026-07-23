import { describe, expect, it } from 'vitest'
import {
  construirUrlAbsoluta,
  escaparXml,
  normalizarUrlSitio,
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
})
