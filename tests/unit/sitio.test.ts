import { describe, expect, it } from 'vitest'
import { configuracionDelSitio, configuracionSitios, esIdSitio, idsSitio, normalizarIdSitio, sitioDesdeHost } from '../../utils/sitio'

describe('sitios Colombia y México', () => {
  it('Colombia es el predeterminado y México solo responde a su subdominio', () => {
    expect(sitioDesdeHost('www.pont3la10.com')).toBe('co')
    expect(sitioDesdeHost('pont3la10.com')).toBe('co')
    expect(sitioDesdeHost('mx.pont3la10.com')).toBe('mx')
    expect(sitioDesdeHost('MX.Pont3la10.com:443')).toBe('mx')
    expect(sitioDesdeHost('mx.pont3la10.com.')).toBe('mx')
    expect(sitioDesdeHost('mx.localhost:3001')).toBe('mx')
  })

  it('un host desconocido, vacío o malicioso nunca muestra México', () => {
    for (const host of [undefined, null, '', 12, 'localhost:3001', 'evil.com', 'mx.pont3la10.com.evil.com', 'xmx.pont3la10.com', 'pont3la10.com.mx', 'a'.repeat(300)]) {
      expect(sitioDesdeHost(host)).toBe('co')
    }
  })

  it('con varios hosts reenviados usa el primero', () => {
    expect(sitioDesdeHost('mx.pont3la10.com, www.pont3la10.com')).toBe('mx')
    expect(sitioDesdeHost('www.pont3la10.com, mx.pont3la10.com')).toBe('co')
  })

  it('normaliza identificadores externos con respaldo seguro', () => {
    expect(normalizarIdSitio(' MX ')).toBe('mx')
    expect(normalizarIdSitio('co')).toBe('co')
    expect(normalizarIdSitio('ar')).toBe('co')
    expect(normalizarIdSitio(['mx'])).toBe('co')
    expect(normalizarIdSitio('xx', 'mx')).toBe('mx')
    expect(esIdSitio('mx')).toBe(true)
    expect(esIdSitio('MX')).toBe(false)
  })

  it('cada sitio tiene zona horaria válida, origen propio y hosts únicos', () => {
    const hosts = idsSitio.flatMap(id => configuracionSitios[id].hosts)
    expect(new Set(hosts).size).toBe(hosts.length)
    for (const id of idsSitio) {
      const sitio = configuracionDelSitio(id)
      expect(sitio.id).toBe(id)
      expect(() => new Intl.DateTimeFormat(sitio.locale, { timeZone: sitio.zonaHoraria })).not.toThrow()
      expect(sitio.hosts).toContain(new URL(sitio.origen).hostname)
    }
    expect(configuracionDelSitio('mx').zonaHoraria).toBe('America/Mexico_City')
    expect(configuracionDelSitio('desconocido').id).toBe('co')
  })
})

describe('identidad por sitio', () => {
  it('México no está lanzado: no es indexable y usa su propio origen', async () => {
    const { origenDelSitio } = await import('../../utils/sitio')
    expect(configuracionDelSitio('mx').indexable).toBe(false)
    expect(configuracionDelSitio('co').indexable).toBe(true)
    expect(origenDelSitio('mx', 'https://www.pont3la10.com')).toBe('https://mx.pont3la10.com')
    expect(origenDelSitio('mx', 'http://localhost:3001')).toBe('https://mx.pont3la10.com')
    expect(origenDelSitio('co', 'http://localhost:3001/')).toBe('http://localhost:3001')
  })

  it('la navegación de México solo enlaza páginas que existen y no menciona Colombia', async () => {
    const { navegacionDe, navegacionMasDe, categoriasDe, pieDe, navegacionSitio, categoriasSitio, pieSitio } = await import('../../data/sitioPublico')
    expect(navegacionDe('co')).toBe(navegacionSitio)
    expect(categoriasDe('co')).toBe(categoriasSitio)
    expect(pieDe('co')).toBe(pieSitio)
    const texto = JSON.stringify([navegacionDe('mx'), navegacionMasDe('mx'), categoriasDe('mx'), pieDe('mx')])
    expect(texto).not.toMatch(/colombi/i)
    expect(navegacionDe('mx').every(item => item.ruta.startsWith('/'))).toBe(true)
    expect(pieDe('mx').columnas.at(-1)).toBe(pieSitio.columnas.at(-1))
  })

  it('el head SEO usa la identidad del sitio y Colombia sigue igual por defecto', async () => {
    const { construirHeadSeoPont3la10 } = await import('../../utils/headSeoPont3la10')
    const opciones = { titulo: 'Hola', descripcion: 'Descripción de prueba', rutaCanonica: '/' }
    const co = construirHeadSeoPont3la10('https://www.pont3la10.com', opciones)
    const mx = construirHeadSeoPont3la10('https://mx.pont3la10.com', opciones, { nombre: 'Pont3la10 México', ogLocale: 'es_MX' })
    const valor = (head: typeof co, propiedad: string) => head.meta.find(m => 'property' in m && m.property === propiedad)?.content
    expect(valor(co, 'og:locale')).toBe('es_CO')
    expect(valor(co, 'og:site_name')).toBe('Pont3la10')
    expect(valor(mx, 'og:locale')).toBe('es_MX')
    expect(valor(mx, 'og:site_name')).toBe('Pont3la10 México')
    expect(valor(mx, 'og:url')).toBe('https://mx.pont3la10.com/')
  })
})

describe('rutas por sitio', () => {
  it('México no sirve páginas solo de Colombia y Colombia no sirve las de México', async () => {
    const { rutaNoDisponibleEnSitio } = await import('../../utils/rutasPorSitio')
    for (const ruta of ['/liga-colombiana', '/seleccion-colombia', '/colombianos-en-europa', '/futbol-colombiano', '/equipos/millonarios', '/jugadores/luis-diaz', '/competiciones/liga-betplay/2026-II', '/partidos/x', '/liga-colombiana/']) {
      expect(rutaNoDisponibleEnSitio(ruta, 'mx')).toBe(true)
      expect(rutaNoDisponibleEnSitio(ruta, 'co')).toBe(false)
    }
    for (const ruta of ['/liga-mx', '/futbol-mexicano', '/liga-mx/']) {
      expect(rutaNoDisponibleEnSitio(ruta, 'co')).toBe(true)
      expect(rutaNoDisponibleEnSitio(ruta, 'mx')).toBe(false)
    }
  })

  it('las páginas comunes siguen disponibles en los dos sitios', async () => {
    const { rutaNoDisponibleEnSitio } = await import('../../utils/rutasPorSitio')
    for (const ruta of ['/', '/articulos', '/articulos/algo', '/partidos-hoy', '/resultados', '/resultados/futbol', '/futbol-internacional', '/especiales', '/quienes-somos', '/admin', '/login', '/equiposhacker', '/liga-mx-falsa']) {
      expect(rutaNoDisponibleEnSitio(ruta, 'mx')).toBe(false)
    }
    expect(rutaNoDisponibleEnSitio('/liga-mx-falsa', 'co')).toBe(false)
  })
})
