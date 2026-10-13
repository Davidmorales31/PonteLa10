import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const paginas = [
  {
    tipo: 'home',
    archivos: ['../../pages/index.vue']
  },
  {
    tipo: 'artículo',
    archivos: ['../../pages/articulos/[slug].vue']
  },
  {
    tipo: 'partido',
    archivos: ['../../pages/partidos/[slug].vue']
  },
  {
    tipo: 'hub',
    archivos: ['../../pages/futbol-colombiano.vue', '../../components/publico/HubEditorialPublico.vue']
  },
  {
    tipo: 'equipo',
    archivos: ['../../pages/equipos/[slug].vue']
  },
  {
    tipo: 'competición',
    archivos: ['../../pages/competiciones/[slug].vue', '../../components/publico/PaginaCompeticionPublica.vue']
  }
]

describe('contrato SEO de páginas públicas', () => {
  it('mantiene identidad de Home, H1 y tarjeta social independientes de la noticia principal', () => {
    const portada = readFileSync(new URL('../../pages/index.vue', import.meta.url), 'utf8')
    const identidad = readFileSync(new URL('../../app.vue', import.meta.url), 'utf8')
    const metadata = portada.slice(portada.indexOf('useSeoPont3la10('), portada.indexOf('</script>'))

    expect(metadata).toContain('Fútbol colombiano: noticias, partidos y resultados | Pont3la10')
    expect(metadata).toContain('Noticias de fútbol colombiano, Selección Colombia y Liga BetPlay. Consulta partidos de hoy, resultados, tabla de posiciones y fútbol internacional en Pont3la10.')
    expect(metadata).not.toContain('portadaPrincipal')
    expect(metadata).toContain("rutaCanonica: '/'")
    expect(portada.match(/<h1\b/g)).toHaveLength(1)
    expect(portada).toContain('Noticias de fútbol colombiano y Selección Colombia</h1>')
    expect(portada).toContain('principal nivel-titulo="h2"')
    expect(portada).toContain('to="/liga-colombiana"')
    expect(portada).toContain('to="/seleccion-colombia"')
    expect(identidad).toContain("rutaActual.path === '/' ? 'NewsMediaOrganization' : 'Organization'")
    expect(identidad.match(/'@type': 'WebSite'/g)).toHaveLength(1)
  })

  it.each(paginas)('$tipo conecta metadatos y JSON-LD a la ruta canonical', ({ archivos }) => {
    const contenido = archivos
      .map(archivo => readFileSync(new URL(archivo, import.meta.url), 'utf8'))
      .join('\n')

    expect(contenido).toContain('useSeoPont3la10')
    expect(contenido).toContain('rutaCanonica')
    expect(contenido).toContain('titulo')
    expect(contenido).toContain('descripcion')
    expect(contenido).toContain('datosEstructurados')
  })

  it('usa fecha de modificación y muestra notas de corrección en el artículo', () => {
    const articulo = readFileSync(new URL('../../pages/articulos/[slug].vue', import.meta.url), 'utf8')

    expect(articulo).toContain('fechaModificacion: articuloPublicado.value?.modificadoEn')
    expect(articulo).toContain('dateModified: articuloPublicado.value.modificadoEn')
    expect(articulo).toContain('class="fecha-actualizacion-articulo"')
    expect(articulo).toContain('class="nota-correccion-articulo"')
    expect(articulo).toContain('articuloPublicado.notaCorreccion')
  })

  it('prepara tarjetas sociales 1200×630 y compartir en fichas de equipo y partido', () => {
    const equipo = readFileSync(new URL('../../pages/equipos/[slug].vue', import.meta.url), 'utf8')
    const partido = readFileSync(new URL('../../pages/partidos/[slug].vue', import.meta.url), 'utf8')
    const plantillaPartido = readFileSync(new URL('../../components/publico/PlantillaPartidoSeo.vue', import.meta.url), 'utf8')
    const imagenEquipo = readFileSync(new URL('../../server/api/equipos/[slug]/imagen.get.ts', import.meta.url), 'utf8')

    expect(equipo).toContain("imagenTipo: 'image/png'")
    expect(equipo).toContain('imagenAncho: 1200')
    expect(equipo).toContain('imagenAlto: 630')
    expect(equipo).toContain('BarraCompartirArticulo')
    expect(partido).toContain('imagenAncho: 1200')
    expect(partido).toContain('imagenAlto: 630')
    expect(plantillaPartido).toContain('BarraCompartirArticulo')
    expect(plantillaPartido).toContain('etiqueta="la ficha del partido"')
    expect(imagenEquipo).toContain('obtenerClienteSupabaseAnonimo')
    expect(imagenEquipo).toContain('obtenerEquipoLigaPublicoPorSlug')
    expect(imagenEquipo).toContain('DURACION_CACHE_NO_ENCONTRADO_MS')
    expect(imagenEquipo).toContain('public, s-maxage=30')
    expect(imagenEquipo).not.toContain('service_role')
  })
})
