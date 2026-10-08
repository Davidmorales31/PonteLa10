import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const userAgent = 'Pont3la10SitemapMonitor/1.0 (+https://www.pont3la10.com)'
const maxSitemaps = 100
const maxUrls = 5_000
const maxBytesSitemap = 10_000_000
const maxBytesSitemapsTotal = 50_000_000
const maxLocsSitemap = 10_000
const maxConcurrency = 8
const origenesSitemapsPermitidos = new Set(['https://www.pont3la10.com'])

export function extraerLocsSitemap(xml, maximoLocs = Number.POSITIVE_INFINITY) {
  const limite = Number.isFinite(maximoLocs) ? Math.max(0, Math.floor(maximoLocs)) : Number.POSITIVE_INFINITY
  if (limite === 0) return []
  const locs = []
  for (const coincidencia of String(xml).matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    const loc = decodificarEntidadXml(coincidencia[1].trim())
    if (!loc) continue
    locs.push(loc)
    if (locs.length >= limite) break
  }
  return locs
}

function decodificarEntidadXml(valor) {
  const decodificarCodigo = (codigo, base) => {
    const punto = Number.parseInt(codigo, base)
    if (!Number.isInteger(punto) || punto < 0 || punto > 0x10ffff || (punto >= 0xd800 && punto <= 0xdfff)) return '\uFFFD'
    return String.fromCodePoint(punto)
  }

  return valor
    .replace(/&#x([\da-f]+);/gi, (_, codigo) => decodificarCodigo(codigo, 16))
    .replace(/&#(\d+);/g, (_, codigo) => decodificarCodigo(codigo, 10))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function normalizarUrlSitemap(valor, origenCanonico) {
  try {
    const origen = new URL(origenCanonico)
    const url = new URL(valor, origen)
    if (valor.includes('\uFFFD')) return null
    if (origen.protocol !== 'https:' || origen.username || origen.password
      || url.protocol !== 'https:' || url.username || url.password || url.origin !== origen.origin) return null
    if (url.search || url.hash || url.href.length > 2_048) return null
    return url.href
  } catch {
    return null
  }
}

export async function seguirRedirecciones(urlInicial, opciones = {}) {
  const {
    origenCanonico,
    metodo = 'HEAD',
    fetchImpl = globalThis.fetch,
    maxRedirecciones = 5,
    timeoutMs = 12_000,
    maxBytesCuerpo = maxBytesSitemap,
    leerCuerpo = false
  } = opciones

  let urlActual
  let origen
  const limiteRedirecciones = normalizarLimite(maxRedirecciones, 5, 0, 10)
  const limiteTimeoutMs = normalizarLimite(timeoutMs, 12_000, 1, 60_000)
  const limiteBytesCuerpo = normalizarLimite(maxBytesCuerpo, maxBytesSitemap, 1, maxBytesSitemap)
  try {
    const inicial = new URL(urlInicial)
    const canonico = new URL(origenCanonico || inicial.origin)
    if (inicial.protocol !== 'https:' || inicial.username || inicial.password || inicial.search || inicial.hash
      || canonico.protocol !== 'https:' || canonico.username || canonico.password || canonico.search || canonico.hash
      || !origenesSitemapsPermitidos.has(inicial.origin) || !origenesSitemapsPermitidos.has(canonico.origin)) {
      throw new Error('url_no_canonica')
    }
    urlActual = inicial.href
    origen = canonico.origin
  } catch {
    return { estadoInicial: null, estadoFinal: null, urlFinal: null, redirecciones: [], cuerpo: null, error: 'url_invalida' }
  }
  if (new URL(urlActual).origin !== origen) {
    return { estadoInicial: null, estadoFinal: null, urlFinal: sanitizarUrlReporte(urlActual), redirecciones: [], cuerpo: null, error: 'origen_no_permitido' }
  }

  const visitadas = new Set()
  const redirecciones = []
  let estadoInicial = null
  let metodoActual = metodo
  let usoFallbackGet = false

  while (true) {
    const claveVisita = `${metodoActual}:${urlActual}`
    if (visitadas.has(claveVisita)) {
      return { estadoInicial, estadoFinal: null, urlFinal: sanitizarUrlReporte(urlActual), redirecciones, cuerpo: null, error: 'bucle_redireccion', usoFallbackGet }
    }
    visitadas.add(claveVisita)

    let respuesta
    try {
      respuesta = await fetchImpl(urlActual, {
        method: metodoActual,
        redirect: 'manual',
        headers: {
          'user-agent': userAgent,
          ...(metodoActual === 'GET' && !leerCuerpo ? { range: 'bytes=0-0' } : {})
        },
        signal: AbortSignal.timeout(limiteTimeoutMs)
      })
    } catch {
      return { estadoInicial, estadoFinal: null, urlFinal: sanitizarUrlReporte(urlActual), redirecciones, cuerpo: null, error: 'error_de_red' , usoFallbackGet }
    }

    if (metodoActual === 'HEAD' && [400, 403, 405, 501].includes(respuesta.status) && !usoFallbackGet) {
      await respuesta.body?.cancel().catch(() => undefined)
      metodoActual = 'GET'
      usoFallbackGet = true
      continue
    }

    if (estadoInicial === null) estadoInicial = respuesta.status
    if (respuesta.status >= 300 && respuesta.status < 400) {
      const location = respuesta.headers.get('location')
      if (!location) {
        await respuesta.body?.cancel().catch(() => undefined)
        return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlActual), redirecciones, cuerpo: null, error: null, usoFallbackGet }
      }

      let urlSiguiente
      try {
        urlSiguiente = new URL(location, urlActual)
      } catch {
        await respuesta.body?.cancel().catch(() => undefined)
        return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlActual), redirecciones, cuerpo: null, error: 'location_invalida', usoFallbackGet }
      }

      if (urlSiguiente.protocol !== 'https:' || urlSiguiente.username || urlSiguiente.password
        || urlSiguiente.search || urlSiguiente.hash) {
        await respuesta.body?.cancel().catch(() => undefined)
        return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlSiguiente.href), redirecciones, cuerpo: null, error: 'redirect_no_canonico', usoFallbackGet }
      }
      redirecciones.push({ desde: sanitizarUrlReporte(urlActual), estado: respuesta.status, hacia: sanitizarUrlReporte(urlSiguiente.href) })
      if (urlSiguiente.origin !== origen) {
        await respuesta.body?.cancel().catch(() => undefined)
        return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlSiguiente.href), redirecciones, cuerpo: null, error: 'redirect_fuera_del_sitio', usoFallbackGet }
      }
      if (redirecciones.length > limiteRedirecciones) {
        await respuesta.body?.cancel().catch(() => undefined)
        return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlSiguiente.href), redirecciones, cuerpo: null, error: 'demasiadas_redirecciones', usoFallbackGet }
      }

      await respuesta.body?.cancel().catch(() => undefined)
      urlActual = urlSiguiente.href
      continue
    }

    let cuerpo = null
    let bytesCuerpo = 0
    if (metodoActual === 'GET' && leerCuerpo) {
      try {
        const lectura = await leerCuerpoLimitado(
          respuesta,
          limiteBytesCuerpo,
          limiteBytesCuerpo < maxBytesSitemap ? 'presupuesto_sitemaps_superado' : 'sitemap_demasiado_grande'
        )
        cuerpo = lectura.cuerpo
        bytesCuerpo = lectura.bytesCuerpo
      } catch (error) {
        const codigoError = error instanceof Error && ['sitemap_demasiado_grande', 'presupuesto_sitemaps_superado'].includes(error.message)
          ? error.message
          : 'cuerpo_no_legible'
        if (error instanceof Error && typeof error.bytesCuerpo === 'number') bytesCuerpo = error.bytesCuerpo
        return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlActual), redirecciones, cuerpo: null, error: codigoError, bytesCuerpo, usoFallbackGet }
      }
    } else {
      await respuesta.body?.cancel().catch(() => undefined)
    }

    return { estadoInicial, estadoFinal: respuesta.status, urlFinal: sanitizarUrlReporte(urlActual), redirecciones, cuerpo, error: null, bytesCuerpo, usoFallbackGet }
  }
}

function sanitizarUrlReporte(valor) {
  try {
    const url = new URL(valor)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

async function leerCuerpoLimitado(respuesta, maximoBytes, codigoExceso) {
  const lector = respuesta.body?.getReader()
  if (!lector) return { cuerpo: '', bytesCuerpo: 0 }
  const fragmentos = []
  let bytesLeidos = 0
  const decodificador = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await lector.read()
      if (done) break
      bytesLeidos += value.byteLength
      if (bytesLeidos > maximoBytes) {
        await lector.cancel().catch(() => undefined)
        const error = new Error(codigoExceso)
        Object.assign(error, { bytesCuerpo: bytesLeidos })
        throw error
      }
      fragmentos.push(decodificador.decode(value, { stream: true }))
    }
    fragmentos.push(decodificador.decode())
    return { cuerpo: fragmentos.join(''), bytesCuerpo: bytesLeidos }
  } catch (error) {
    if (error instanceof Error && typeof error.bytesCuerpo !== 'number') {
      Object.assign(error, { bytesCuerpo: bytesLeidos })
    }
    throw error
  } finally {
    lector.releaseLock()
  }
}

async function mapearConLimite(elementos, limite, transformar) {
  const resultados = new Array(elementos.length)
  let siguiente = 0
  const tareas = Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (true) {
      const indice = siguiente++
      if (indice >= elementos.length) return
      resultados[indice] = await transformar(elementos[indice])
    }
  })
  await Promise.all(tareas)
  return resultados
}

function estaEn200SinRedirect(resultado) {
  return !resultado.error
    && resultado.estadoInicial === 200
    && resultado.estadoFinal === 200
    && resultado.redirecciones.length === 0
}

function crearIncidencia(tipo, url, resultado, detalles = {}) {
  return {
    tipo,
    url,
    estadoInicial: resultado?.estadoInicial ?? null,
    estadoFinal: resultado?.estadoFinal ?? null,
    redirecciones: resultado?.redirecciones ?? [],
    error: resultado?.error ?? null,
    ...detalles
  }
}

export async function auditarSitemaps({
  baseUrl = process.env.SEO_SITE_URL || process.env.NUXT_PUBLIC_SITE_URL || 'https://www.pont3la10.com',
  fetchImpl = globalThis.fetch,
  concurrencia = 4,
  maximoUrls = maxUrls,
  maxBytesTotal = maxBytesSitemapsTotal,
  maximoLocs = maxLocsSitemap
} = {}) {
  const limiteConcurrencia = normalizarLimite(concurrencia, 4, 1, maxConcurrency)
  const limiteUrls = normalizarLimite(maximoUrls, maxUrls, 1, maxUrls)
  const limiteBytesTotal = normalizarLimite(maxBytesTotal, maxBytesSitemapsTotal, 1, maxBytesSitemapsTotal)
  const limiteLocs = normalizarLimite(maximoLocs, maxLocsSitemap, 1, maxLocsSitemap)
  let origenCanonico
  try {
    const base = new URL(baseUrl)
    if (base.protocol !== 'https:' || base.username || base.password
      || !origenesSitemapsPermitidos.has(base.origin)) throw new Error('origen_no_permitido')
    origenCanonico = base.origin
  } catch {
    return { origen: null, sitemaps: 0, urlsEncontradas: 0, urlsComprobadas: 0, aliasComprobados: 0, incidencias: [{ tipo: 'configuracion', error: 'origen_https_invalido_o_no_permitido' }], principalesUrlsRotas: [] }
  }

  const sitemapInicial = `${origenCanonico}/sitemap.xml`
  const pendientes = [sitemapInicial]
  const sitemapsVisitados = new Set()
  const urlsConOrigen = new Map()
  const incidencias = []
  let bytesSitemapsLeidos = 0
  let locsLeidos = 0

  while (pendientes.length > 0) {
    const urlSitemap = pendientes.shift()
    if (!urlSitemap || sitemapsVisitados.has(urlSitemap)) continue
    if (sitemapsVisitados.size >= maxSitemaps) {
      incidencias.push({ tipo: 'limite_sitemaps', error: 'se_supero_el_maximo_de_sitemaps' })
      break
    }
    sitemapsVisitados.add(urlSitemap)

    const bytesRestantes = limiteBytesTotal - bytesSitemapsLeidos
    if (bytesRestantes <= 0) {
      incidencias.push({ tipo: 'limite_bytes_sitemaps', error: 'se_supero_el_presupuesto_global_de_sitemaps' })
      break
    }

    const resultado = await seguirRedirecciones(urlSitemap, {
      origenCanonico,
      metodo: 'GET',
      fetchImpl,
      maxBytesCuerpo: Math.min(maxBytesSitemap, bytesRestantes),
      leerCuerpo: true
    })
    bytesSitemapsLeidos += resultado.bytesCuerpo || 0
    if (['presupuesto_sitemaps_superado', 'sitemap_demasiado_grande'].includes(resultado.error)) {
      const esPresupuestoGlobal = resultado.error === 'presupuesto_sitemaps_superado'
      incidencias.push(crearIncidencia(
        esPresupuestoGlobal ? 'limite_bytes_sitemaps' : 'sitemap_demasiado_grande',
        urlSitemap,
        resultado,
        { causa: resultado.error }
      ))
      break
    }
    if (resultado.error === 'cuerpo_no_legible') {
      incidencias.push(crearIncidencia('sitemap_cuerpo_no_legible', urlSitemap, resultado))
      break
    }
    if (!estaEn200SinRedirect(resultado)) incidencias.push(crearIncidencia('sitemap_no_200_o_redirect', urlSitemap, resultado))
    if (resultado.estadoFinal !== 200 || !resultado.cuerpo) continue

    const locsRestantes = limiteLocs - locsLeidos
    const locs = extraerLocsSitemap(resultado.cuerpo, locsRestantes + 1)
    if (locs.length > locsRestantes) {
      incidencias.push({ tipo: 'limite_locs_sitemap', sitemap: urlSitemap, error: 'se_supero_el_maximo_global_de_locs' })
      break
    }
    locsLeidos += locs.length
    if (/<sitemapindex\b/i.test(resultado.cuerpo)) {
      for (const loc of locs) {
        const urlInterna = normalizarUrlSitemap(loc, origenCanonico)
        if (!urlInterna) {
          incidencias.push({ tipo: 'loc_de_sitemap_invalido', sitemap: urlSitemap })
          continue
        }
        if (!sitemapsVisitados.has(urlInterna)) pendientes.push(urlInterna)
      }
      continue
    }

    for (const loc of locs) {
      const urlInterna = normalizarUrlSitemap(loc, origenCanonico)
      if (!urlInterna) {
        incidencias.push({ tipo: 'loc_de_sitemap_invalido', sitemap: urlSitemap })
        continue
      }
      const fuentes = urlsConOrigen.get(urlInterna) || new Set()
      fuentes.add(urlSitemap)
      urlsConOrigen.set(urlInterna, fuentes)
    }
  }

  const todasLasUrls = [...urlsConOrigen.keys()].sort()
  if (todasLasUrls.length === 0) incidencias.push({ tipo: 'sitemap_vacio', error: 'no_se_encontraron_urls_publicas' })
  if (todasLasUrls.length > limiteUrls) {
    incidencias.push({ tipo: 'limite_urls', error: 'se_supero_el_maximo_de_urls', encontradas: todasLasUrls.length, maximo: limiteUrls })
  }
  const urlsAComprobar = todasLasUrls.slice(0, limiteUrls)

  console.log(`[seo-sitemap] Comprobando ${urlsAComprobar.length} URLs de sitemap; concurrencia máxima: ${limiteConcurrencia}.`)

  const comprobaciones = await mapearConLimite(urlsAComprobar, limiteConcurrencia, async (url) => {
    const resultado = await seguirRedirecciones(url, { origenCanonico, metodo: 'HEAD', fetchImpl })
    const fuentes = [...(urlsConOrigen.get(url) || [])].map((fuente) => new URL(fuente).pathname)
    if (!estaEn200SinRedirect(resultado)) incidencias.push(crearIncidencia('url_sitemap_no_200_o_redirect', url, resultado, { fuentes }))
    return { url, resultado, fuentes }
  })

  const urlsDePartido = todasLasUrls.filter((url) => {
    const pathname = new URL(url).pathname
    return [...(urlsConOrigen.get(url) || [])].some((fuente) => new URL(fuente).pathname.endsWith('/sitemap-matches.xml'))
      && pathname.startsWith('/partidos/')
  })
  // Las dos rutas antiguas comparten el mismo manejador dinámico. Una ficha
  // representativa comprueba ambos aliases sin duplicar 1.200 peticiones por
  // cada ejecución cuando el sitemap contiene cientos de partidos históricos.
  const rutasAlias = urlsDePartido.slice(0, 1).flatMap((urlCanonica) => {
    const path = new URL(urlCanonica).pathname
    const slug = path.slice('/partidos/'.length)
    return ['como-quedo', 'donde-ver'].map((prefijo) => ({
      urlCanonica,
      urlAlias: `${origenCanonico}/${prefijo}/${slug}`
    }))
  })

  const comprobacionesAlias = await mapearConLimite(rutasAlias, limiteConcurrencia, async ({ urlCanonica, urlAlias }) => {
    const resultado = await seguirRedirecciones(urlAlias, { origenCanonico, metodo: 'HEAD', fetchImpl })
    const pathCanonico = new URL(urlCanonica).pathname
    const pathFinal = resultado.urlFinal
      ? (() => {
          try {
            return new URL(resultado.urlFinal).pathname
          } catch {
            return null
          }
        })()
      : null
    const correcto = resultado.estadoInicial === 301
      && resultado.estadoFinal === 200
      && resultado.redirecciones.length === 1
      && pathFinal === pathCanonico
      && !resultado.error
    if (!correcto) incidencias.push(crearIncidencia('alias_partido_incorrecto', urlAlias, resultado, { urlCanonicaEsperada: urlCanonica }))
    return { urlAlias, urlCanonica, correcto, resultado }
  })

  console.log(`[seo-sitemap] Terminó el rastreo; ${comprobacionesAlias.length} aliases de partido comprobados.`)

  const frecuenciasRotas = new Map()
  for (const incidencia of incidencias) {
    if (incidencia.tipo !== 'url_sitemap_no_200_o_redirect' || !incidencia.url) continue
    const path = new URL(incidencia.url).pathname
    const conteo = Math.max(1, incidencia.fuentes?.length || 1)
    frecuenciasRotas.set(path, (frecuenciasRotas.get(path) || 0) + conteo)
  }

  const principalesUrlsRotas = [...frecuenciasRotas]
    .map(([ruta, menciones]) => ({ ruta, menciones }))
    .sort((a, b) => b.menciones - a.menciones || a.ruta.localeCompare(b.ruta))
    .slice(0, 10)

  return {
    origen: origenCanonico,
    sitemaps: sitemapsVisitados.size,
    urlsEncontradas: todasLasUrls.length,
    urlsComprobadas: comprobaciones.length,
    aliasComprobados: comprobacionesAlias.length,
    aliasIncorrectos: comprobacionesAlias.filter(({ correcto }) => !correcto).length,
    incidencias,
    principalesUrlsRotas
  }
}

function normalizarLimite(valor, predeterminado, minimo, maximo) {
  if (!Number.isFinite(valor)) return predeterminado
  return Math.min(maximo, Math.max(minimo, Math.floor(valor)))
}

function tablaResumen(auditoria) {
  const filas = [
    '# Monitor SEO: 404, sitemaps y redirects',
    '',
    `- Origen: ${auditoria.origen || 'configuración inválida'}`,
    `- Sitemaps leídos: ${auditoria.sitemaps}`,
    `- URLs públicas: ${auditoria.urlsEncontradas}; comprobadas: ${auditoria.urlsComprobadas}`,
    `- Alias de partidos comprobados: ${auditoria.aliasComprobados}; incorrectos: ${auditoria.aliasIncorrectos ?? 0}`,
    `- Incidencias: ${auditoria.incidencias.length}`,
    ''
  ]

  if (auditoria.principalesUrlsRotas.length > 0) {
    filas.push('## URLs rotas o redirigidas (hasta 10)', '', '| Ruta | Referencias |', '| --- | ---: |')
    for (const { ruta, menciones } of auditoria.principalesUrlsRotas) {
      filas.push(`| \`${ruta.replaceAll('`', '')}\` | ${menciones} |`)
    }
    filas.push('')
  }

  if (auditoria.incidencias.length > 0) {
    filas.push('## Detalle', '')
    for (const incidencia of auditoria.incidencias.slice(0, 100)) {
      const ruta = incidencia.url ? ` \`${String(incidencia.url).replaceAll('`', '')}\`` : ''
      const estados = incidencia.estadoInicial !== undefined
        ? ` (HTTP ${incidencia.estadoInicial ?? 'sin respuesta'} → ${incidencia.estadoFinal ?? 'sin respuesta'})`
        : ''
      const saltos = incidencia.redirecciones?.length ? `; saltos=${incidencia.redirecciones.length}` : ''
      filas.push(`- **${incidencia.tipo}**${ruta}${estados}${saltos}${incidencia.error ? `; ${incidencia.error}` : ''}`)
    }
    if (auditoria.incidencias.length > 100) filas.push(`- … y ${auditoria.incidencias.length - 100} incidencias más`)
  } else {
    filas.push('Todos los enlaces del sitemap respondieron 200 y los alias redirigieron directamente a la ficha canónica.')
  }

  return `${filas.join('\n')}\n`
}

export async function main(opciones = {}) {
  const auditoria = await auditarSitemaps(opciones)
  const resumen = tablaResumen(auditoria)
  console.log(JSON.stringify(auditoria, null, 2))
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumen, 'utf8')
  else console.log(resumen)
  if (auditoria.incidencias.length > 0) process.exitCode = 1
  return auditoria
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main()
}
