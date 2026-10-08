import { describe, expect, it } from 'vitest'
import {
  auditarSitemaps,
  extraerLocsSitemap,
  normalizarUrlSitemap,
  seguirRedirecciones
} from '../../scripts/auditar-sitemaps.mjs'

describe('auditoría de sitemaps', () => {
  it('extrae y decodifica locs de XML', () => {
    expect(extraerLocsSitemap('<urlset><url><loc>https://www.pont3la10.com/a?b=1&amp;c=2</loc></url></urlset>'))
      .toEqual(['https://www.pont3la10.com/a?b=1&c=2'])
    expect(extraerLocsSitemap('<urlset><url><loc>https://www.pont3la10.com/a&#x110000;</loc></url></urlset>'))
      .toEqual(['https://www.pont3la10.com/a\uFFFD'])
  })

  it('acepta únicamente URLs HTTPS sin query del origen canónico', () => {
    expect(normalizarUrlSitemap('/partidos/local-vs-visitante', 'https://www.pont3la10.com'))
      .toBe('https://www.pont3la10.com/partidos/local-vs-visitante')
    expect(normalizarUrlSitemap('https://evil.example/404', 'https://www.pont3la10.com')).toBeNull()
    expect(normalizarUrlSitemap('/partidos?id=1', 'https://www.pont3la10.com')).toBeNull()
    expect(normalizarUrlSitemap('https://www.pont3la10.com/a\uFFFD', 'https://www.pont3la10.com')).toBeNull()
    expect(normalizarUrlSitemap('https://user:secret@www.pont3la10.com/partidos/x', 'https://www.pont3la10.com')).toBeNull()
  })

  it('rechaza HTTP al invocar directamente el helper de redirecciones', async () => {
    let solicitudes = 0
    const resultado = await seguirRedirecciones('http://www.pont3la10.com/ruta', {
      fetchImpl: async () => { solicitudes += 1; return new Response(null, { status: 200 }) }
    })
    expect(resultado.error).toBe('url_invalida')
    expect(solicitudes).toBe(0)
  })

  it('rechaza otros orígenes HTTPS y puertos alternativos en el helper', async () => {
    let solicitudes = 0
    const fetchMock = async () => { solicitudes += 1; return new Response(null, { status: 200 }) }
    const origenExterno = await seguirRedirecciones('https://evil.example/ruta', { fetchImpl: fetchMock })
    const puertoAlternativo = await seguirRedirecciones('https://www.pont3la10.com:8443/ruta', { fetchImpl: fetchMock })
    expect(origenExterno.error).toBe('url_invalida')
    expect(puertoAlternativo.error).toBe('url_invalida')
    expect(solicitudes).toBe(0)
  })

  it('devuelve error sin lanzar cuando recibe una URL inicial inválida', async () => {
    const resultado = await seguirRedirecciones('no-es-una-url')
    expect(resultado).toMatchObject({ error: 'url_invalida', urlFinal: null, redirecciones: [] })
  })

  it('sigue redirects locales y detecta la cadena', async () => {
    const respuestas = [
      new Response(null, { status: 301, headers: { location: '/paso-1' } }),
      new Response(null, { status: 302, headers: { location: '/final' } }),
      new Response(null, { status: 200 })
    ]
    const fetchMock = async () => respuestas.shift() as Response
    const resultado = await seguirRedirecciones('https://www.pont3la10.com/inicio', {
      origenCanonico: 'https://www.pont3la10.com',
      fetchImpl: fetchMock
    })

    expect(resultado).toMatchObject({ estadoInicial: 301, estadoFinal: 200, redirecciones: [{ estado: 301 }, { estado: 302 }] })
  })

  it('no sigue un redirect fuera del dominio permitido', async () => {
    let solicitudes = 0
    const fetchMock = async () => {
      solicitudes += 1
      return new Response(null, { status: 301, headers: { location: 'https://evil.example/' } })
    }
    const resultado = await seguirRedirecciones('https://www.pont3la10.com/rota', {
      origenCanonico: 'https://www.pont3la10.com',
      fetchImpl: fetchMock
    })

    expect(resultado.error).toBe('redirect_fuera_del_sitio')
    expect(solicitudes).toBe(1)
  })

  it('usa GET solo si el servidor no soporta HEAD', async () => {
    const metodos: string[] = []
    const fetchMock = async (_url: string | URL | Request, init?: RequestInit) => {
      metodos.push(String(init?.method))
      return new Response(null, { status: init?.method === 'HEAD' ? 405 : 200 })
    }
    const resultado = await seguirRedirecciones('https://www.pont3la10.com/ruta', {
      origenCanonico: 'https://www.pont3la10.com',
      fetchImpl: fetchMock
    })

    expect(metodos).toEqual(['HEAD', 'GET'])
    expect(resultado).toMatchObject({ estadoInicial: 200, estadoFinal: 200, usoFallbackGet: true })
  })

  it('limpia consultas sensibles de URLs de redirección que terminan en error', async () => {
    const resultado = await seguirRedirecciones('https://www.pont3la10.com/ruta', {
      origenCanonico: 'https://www.pont3la10.com',
      fetchImpl: async () => new Response(null, { status: 302, headers: { location: '/final?token=secreto' } })
    })
    expect(resultado.error).toBe('redirect_no_canonico')
    expect(JSON.stringify(resultado)).not.toContain('secreto')
    expect(resultado.urlFinal).toBe('https://www.pont3la10.com/final')
  })

  it('limita el sitemap mientras consume el stream, no después de cargarlo entero', async () => {
    let bytesEntregados = 0
    let cancelado = false
    const cuerpo = new ReadableStream<Uint8Array>({
      pull(controlador) {
        if (bytesEntregados >= 10_100_000) return
        const cantidad = Math.min(64_000, 10_100_000 - bytesEntregados)
        bytesEntregados += cantidad
        controlador.enqueue(new Uint8Array(cantidad))
      },
      cancel() { cancelado = true }
    })
    const resultado = await seguirRedirecciones('https://www.pont3la10.com/sitemap.xml', {
      origenCanonico: 'https://www.pont3la10.com',
      metodo: 'GET',
      leerCuerpo: true,
      fetchImpl: async () => new Response(cuerpo, { status: 200 })
    })
    expect(resultado.error).toBe('sitemap_demasiado_grande')
    expect(bytesEntregados).toBeLessThanOrEqual(10_100_000)
    expect(cancelado).toBe(true)
  })

  it('audita páginas públicas y exige que aliases redirijan en un salto a la ficha canónica', async () => {
    const origen = 'https://www.pont3la10.com'
    const slug = 'local-vs-visitante'
    const respuestas = new Map<string, (metodo: string) => Response>([
      [`${origen}/sitemap.xml`, () => new Response(`<sitemapindex><sitemap><loc>${origen}/sitemap-matches.xml</loc></sitemap><sitemap><loc>${origen}/sitemap-pages.xml</loc></sitemap></sitemapindex>`, { status: 200 })],
      [`${origen}/sitemap-matches.xml`, () => new Response(`<urlset><url><loc>${origen}/partidos/${slug}</loc></url></urlset>`, { status: 200 })],
      [`${origen}/sitemap-pages.xml`, () => new Response(`<urlset><url><loc>${origen}/liga-colombiana</loc></url></urlset>`, { status: 200 })],
      [`${origen}/partidos/${slug}`, () => new Response(null, { status: 200 })],
      [`${origen}/liga-colombiana`, () => new Response(null, { status: 200 })],
      [`${origen}/como-quedo/${slug}`, () => new Response(null, { status: 301, headers: { location: `/partidos/${slug}` } })],
      [`${origen}/donde-ver/${slug}`, () => new Response(null, { status: 301, headers: { location: `/partidos/${slug}` } })]
    ])
    const fetchMock = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const respuesta = respuestas.get(url)
      return respuesta ? respuesta(String(init?.method)) : new Response(null, { status: 404 })
    }
    const resultado = await auditarSitemaps({ baseUrl: origen, fetchImpl: fetchMock, concurrencia: Number.POSITIVE_INFINITY, maximoUrls: Number.NaN })

    expect(resultado).toMatchObject({ sitemaps: 3, urlsEncontradas: 2, urlsComprobadas: 2, aliasComprobados: 2, aliasIncorrectos: 0, incidencias: [] })
  })

  it('rechaza orígenes fuera del dominio auditado para evitar SSRF por configuración', async () => {
    let solicitudes = 0
    const resultado = await auditarSitemaps({
      baseUrl: 'https://127.0.0.1',
      fetchImpl: async () => { solicitudes += 1; return new Response(null, { status: 200 }) }
    })
    expect(resultado.incidencias).toContainEqual({ tipo: 'configuracion', error: 'origen_https_invalido_o_no_permitido' })
    expect(solicitudes).toBe(0)
  })

  it('rechaza puertos alternativos en el origen del auditor', async () => {
    let solicitudes = 0
    const resultado = await auditarSitemaps({
      baseUrl: 'https://www.pont3la10.com:8443',
      fetchImpl: async () => { solicitudes += 1; return new Response(null, { status: 200 }) }
    })
    expect(resultado.incidencias[0]?.error).toBe('origen_https_invalido_o_no_permitido')
    expect(solicitudes).toBe(0)
  })

  it('corta la lectura cuando se agota el presupuesto global en vez de cargar otro sitemap', async () => {
    const origen = 'https://www.pont3la10.com'
    const indice = `<sitemapindex><sitemap><loc>${origen}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${origen}/sitemap-matches.xml</loc></sitemap></sitemapindex>`
    const cuerpos = new Map([
      [`${origen}/sitemap.xml`, indice],
      [`${origen}/sitemap-pages.xml`, '<urlset><url><loc>https://www.pont3la10.com/liga-colombiana</loc></url></urlset>'],
      [`${origen}/sitemap-matches.xml`, '<urlset></urlset>']
    ])
    const llamadas: string[] = []
    const presupuesto = new TextEncoder().encode(indice).byteLength + 10
    const resultado = await auditarSitemaps({
      baseUrl: origen,
      maxBytesTotal: presupuesto,
      fetchImpl: async (input) => {
        const url = String(input)
        llamadas.push(url)
        return new Response(cuerpos.get(url), { status: 200 })
      }
    })
    expect(resultado.incidencias[0]).toMatchObject({ tipo: 'limite_bytes_sitemaps', error: 'presupuesto_sitemaps_superado' })
    expect(llamadas).toEqual([`${origen}/sitemap.xml`, `${origen}/sitemap-pages.xml`])
  })

  it('aborta el rastreo completo al encontrar un sitemap individual sobredimensionado', async () => {
    const origen = 'https://www.pont3la10.com'
    let bytesEntregados = 0
    let cancelado = false
    const grande = new ReadableStream<Uint8Array>({
      pull(controlador) {
        if (bytesEntregados >= 10_200_000) return
        const cantidad = Math.min(64_000, 10_200_000 - bytesEntregados)
        bytesEntregados += cantidad
        controlador.enqueue(new Uint8Array(cantidad))
      },
      cancel() { cancelado = true }
    })
    const llamadas: string[] = []
    const resultado = await auditarSitemaps({
      baseUrl: origen,
      fetchImpl: async (input) => {
        llamadas.push(String(input))
        if (llamadas.length === 1) return new Response(grande, { status: 200 })
        return new Response('<urlset></urlset>', { status: 200 })
      }
    })
    expect(resultado.incidencias[0]).toMatchObject({ tipo: 'sitemap_demasiado_grande', causa: 'sitemap_demasiado_grande' })
    expect(llamadas).toEqual([`${origen}/sitemap.xml`])
    expect(bytesEntregados).toBeLessThan(10_200_000)
    expect(cancelado).toBe(true)
  })

  it('limita la cantidad total de locs procesados incluso si el índice tiene más entradas', async () => {
    const origen = 'https://www.pont3la10.com'
    const indice = `<sitemapindex>${['a', 'b', 'c'].map(nombre => `<sitemap><loc>${origen}/sitemap-${nombre}.xml</loc></sitemap>`).join('')}</sitemapindex>`
    let llamadas = 0
    const resultado = await auditarSitemaps({
      baseUrl: origen,
      maximoLocs: 2,
      fetchImpl: async () => { llamadas += 1; return new Response(indice, { status: 200 }) }
    })
    expect(resultado.incidencias).toContainEqual({
      tipo: 'limite_locs_sitemap',
      sitemap: `${origen}/sitemap.xml`,
      error: 'se_supero_el_maximo_global_de_locs'
    })
    expect(llamadas).toBe(1)
  })
})
