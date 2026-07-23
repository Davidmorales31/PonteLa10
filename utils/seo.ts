export const robotsIndexables = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const robotsNoIndex = 'noindex, follow, max-image-preview:large'
export const imagenSeoPredeterminada = '/editorial/login_pont3la10_estadio_sin_logo.png'

export function normalizarUrlSitio(url: string): string {
  return url.replace(/\/+$/, '')
}

export function construirUrlAbsoluta(urlSitio: string, ruta: string): string {
  if (/^https?:\/\//i.test(ruta)) return ruta
  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`
  return `${normalizarUrlSitio(urlSitio)}${rutaNormalizada}`
}

export function serializarJsonLd(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c')
}

export function escaparXml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}
