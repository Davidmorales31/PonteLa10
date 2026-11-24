// Origen del sitio para el flujo de video. Lo que se LEE (artículos, fotos de portada) sale de `SITIO_API`; los enlaces que
// se muestran al público (descripciones, notas) siempre usan `SITIO_PUBLICO`.
//
// Si el sitio público está caído (por ejemplo, Vercel desactivó el despliegue), el video puede seguir leyendo los artículos
// de Supabase a través de un servidor local del propio proyecto:
//   1) Terminal A (deja el sitio local con la API leyendo Supabase directo, puerto libre, sin pasar por producción):
//        $env:NUXT_PUBLIC_API_ORIGIN = ''; node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3002
//   2) Terminal B (estudio y comandos de video):
//        $env:PONT3LA10_API_SITIO = 'http://127.0.0.1:3002'; npm run video:estudio
// Sin la variable, todo funciona como antes contra https://www.pont3la10.com.
export const SITIO_PUBLICO = 'https://www.pont3la10.com'

/** Solo http(s) (nunca otro protocolo) y sin barra final; si el valor no sirve, se usa el sitio público. */
export function origenApi(valor, respaldo = SITIO_PUBLICO) {
  try {
    const url = new URL(String(valor || '').trim())
    if (!['http:', 'https:'].includes(url.protocol)) return respaldo
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return respaldo
  }
}

export const SITIO_API = origenApi(process.env.PONT3LA10_API_SITIO)
