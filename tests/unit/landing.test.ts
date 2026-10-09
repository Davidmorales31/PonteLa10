import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { categoriasSitio, navegacionMasSitio, navegacionSitio } from '../../data/sitioPublico'
import {
  aumentarNoticiasVisibles,
  combinarArticulosPublicos,
  normalizarTextoBusqueda,
  obtenerAliasCategoria,
  obtenerEtiquetaCategoria
} from '../../utils/articulosLanding'

describe('configuración de la landing', () => {
  it('usa rutas internas para las acciones principales', () => {
    const rutas = [
      ...navegacionSitio.map(item => item.ruta),
      ...navegacionMasSitio.map(item => item.ruta),
      ...categoriasSitio.map(categoria => categoria.ruta)
    ]

    expect(rutas.every(ruta => ruta.startsWith('/'))).toBe(true)
  })

  it('normaliza tildes y mayúsculas para filtros', () => {
    expect(normalizarTextoBusqueda('  FÚTBOL Colombiano  ')).toBe('futbol colombiano')
    expect(obtenerAliasCategoria('tecnologia')).toContain('tech deportiva')
    expect(obtenerAliasCategoria('futbol-colombiano')).toEqual([])
    expect(obtenerEtiquetaCategoria('futbol-colombiano')).toBe('fútbol colombiano')
  })

  it('combina páginas de noticias sin repetir slugs', () => {
    const existentes = [{ slug: 'primera', titulo: 'Primera' }]
    const nuevos = [
      { slug: 'primera', titulo: 'Duplicada' },
      { slug: 'segunda', titulo: 'Segunda' }
    ]

    expect(combinarArticulosPublicos(existentes, nuevos)).toEqual([
      { slug: 'primera', titulo: 'Primera' },
      { slug: 'segunda', titulo: 'Segunda' }
    ])
  })

  it('muestra el siguiente bloque sin superar la cantidad disponible', () => {
    expect(aumentarNoticiasVisibles(6, 20)).toBe(12)
    expect(aumentarNoticiasVisibles(18, 20)).toBe(20)
    expect(aumentarNoticiasVisibles(6, 4)).toBe(4)
  })

  it('aplica colores claros al buscador cuando el tema blanco está activo', () => {
    const estilos = readFileSync(new URL('../../assets/css/landing.css', import.meta.url), 'utf8')

    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing')
    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing input')
    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing input::placeholder')
    expect(estilos).toContain('body.tema-publico-blanco .busqueda-cabecera-landing input:focus')
  })

  it('mantiene la portada de fútbol conectada a datos reales y sus módulos SEO', () => {
    const portada = readFileSync(new URL('../../pages/index.vue', import.meta.url), 'utf8')

    expect(portada).toContain("query: { deporte: 'futbol', timeZone: zonaHorariaColombia }")
    expect(portada).toContain('id="titulo-jornada-home"')
    expect(portada).toContain('id="titulo-liga-home"')
    expect(portada).toContain('id="titulo-seleccion-home"')
    expect(portada).toContain('id="titulo-europa-home"')
    expect(portada).toContain('articulo-destacado-portada')
  })

  it('adapta el esqueleto de referencia y conserva un único H1 de producto', () => {
    const portada = readFileSync(new URL('../../pages/index.vue', import.meta.url), 'utf8')
    const noticiaPortada = readFileSync(new URL('../../components/NoticiaPortada.vue', import.meta.url), 'utf8')

    expect(portada).toContain('class="medio-introduccion"')
    expect(portada).toContain('<h1 id="titulo-portada-home">Fútbol colombiano y Selección Colombia</h1>')
    expect(portada).toContain('principal nivel-titulo="h2"')
    expect(portada.match(/<h1\b/g)).toHaveLength(1)
    expect(noticiaPortada).toContain("props.nivelTitulo ?? (props.principal ? 'h1' : 'h2')")
    expect(portada).toContain('grid-template-columns: minmax(235px, .82fr) minmax(0, 1.28fr) minmax(0, .82fr)')
  })

  it('da estilo al contenido nuevo en ambos temas públicos', () => {
    const estilos = readFileSync(new URL('../../assets/css/landing.css', import.meta.url), 'utf8')

    expect(estilos).toContain('body.tema-publico-blanco .portada-medio :is(.home-panel')
    expect(estilos).toContain('.home-sin-datos-contenido, .tarjeta-articulo-portada)')
    expect(estilos).toContain('.home-tabla, .home-tabla tbody > tr > th')
    expect(estilos).toContain('body.tema-publico-blanco .medio-introduccion h1')
    expect(estilos).toContain('body.tema-publico-blanco .portada-medio .medio-introduccion > p:last-child')
  })
})
