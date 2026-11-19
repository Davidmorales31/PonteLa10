import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

describe('contenido fuera del foco de fútbol no compite por indexación', () => {
  it.each(['baloncesto', 'beisbol', 'tenis'])('el listado de %s es noindex', (deporte) => {
    const pagina = leer(`../../pages/resultados/${deporte}.vue`)
    expect(pagina).toContain('robots: robotsNoIndex')
  })

  it('el sitemap de páginas solo conserva los resultados de fútbol', () => {
    const sitemap = leer('../../server/routes/sitemap-pages.xml.get.ts')
    expect(sitemap).toContain("'/resultados/futbol'")
    for (const deporte of ['baloncesto', 'beisbol', 'tenis']) {
      expect(sitemap).not.toContain(`/resultados/${deporte}`)
    }
  })

  it('el detalle de resultados es noindex salvo en fútbol', () => {
    const detalle = leer('../../pages/resultados/[id].vue')
    expect(detalle).toContain("partido.deporte !== 'futbol'")
    expect(detalle).toContain('robotsNoIndex')
  })

  it('los filtros de artículos sin hub canónico y los temas son noindex', () => {
    const listado = leer('../../pages/articulos/index.vue')
    expect(listado).toContain('debeEvitarIndexacion')
    expect(listado).toContain('!rutasCanonicasCategoria.value[categoria]')
    expect(listado).toContain('robots: debeEvitarIndexacion.value ? robotsNoIndex : undefined')
  })
})

describe('H1 accesible de la Liga colombiana', () => {
  it('la página declara un único H1 para lectores y buscadores', () => {
    const pagina = leer('../../pages/liga-colombiana.vue')
    expect(pagina.match(/<h1\b/g)).toHaveLength(1)
    expect(pagina).toContain('solo-lectores-liga')
  })
})
