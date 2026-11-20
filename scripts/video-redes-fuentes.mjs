// Fotos y videos de redes sociales para el video diario.
//
// De dónde salen: las notas de los medios (la fuente del artículo y las de `fuentesFotos`) incrustan publicaciones
// de X de los clubes, los protagonistas, la Dimayor y los periodistas. También pueden venir URLs de publicaciones
// de X puestas directamente en `fuentesFotos`. Sus fotos y videos se leen con la API pública de FxTwitter
// (https://github.com/FixTweet/FxTwitter, MIT): sin cuenta, sin llave y sin API de pago de X.
//
// Instagram ya no entrega sus imágenes sin iniciar sesión (su embed se arma con JavaScript), así que no se usa.
// Nunca se descargan videos de YouTube (sus términos lo prohíben y Content ID reclama la transmisión).

const API = 'https://api.fxtwitter.com'
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Pont3la10-estudio'
const PUBLICACION = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/i
const RESERVADAS = new Set(['i', 'intent', 'share', 'home', 'search', 'hashtag'])

/** Usuario e id de una publicación de X; null si la URL no es una publicación. */
export function publicacionX(url) {
  const m = PUBLICACION.exec(String(url || '').trim())
  if (!m || RESERVADAS.has(m[1].toLowerCase())) return null
  return { usuario: m[1], id: m[2], url: `https://x.com/${m[1]}/status/${m[2]}` }
}

/** Publicaciones de X incrustadas o enlazadas en el HTML de una nota (sin repetir y sin enlaces de «compartir»). */
export function publicacionesEnPagina(html, limite = 8) {
  const vistas = new Map()
  for (const m of String(html || '').matchAll(/https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status(?:es)?\/\d{5,25}/gi)) {
    const pub = publicacionX(m[0])
    if (pub && !vistas.has(pub.id)) vistas.set(pub.id, pub)
    if (vistas.size >= limite) break
  }
  return [...vistas.values()]
}

// Cuentas de canales y plataformas con derechos de transmisión: sus clips son imágenes de partido y Content ID
// los reclama. De ellas no se toman videos (sus fotos tampoco son de partido, pero se dejan pasar con crédito).
export const EMISORAS = /win ?sports|espn|dsports|directv|caracol|rcn|tudn|telemundo|fox ?sports|star ?plus|paramount|movistar|dazn|bein|claro ?sports|tyc ?sports|vix|prime ?video|conmebol ?tv|fifa ?\+/i

/** Nombre de cuenta legible para buscar coincidencias: «BlessdOficial» → «Blessd Oficial». */
export const cuentaLegible = autor => String(autor || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_\d]+/g, ' ')

/** Crédito de una foto o video de red social: «@cuenta en X (vía Medio)». */
export function creditoDeRed(autor, medio = '') {
  const cuenta = String(autor || '').replace(/^@?/, '@')
  return `${cuenta} en X${medio ? ` (vía ${medio})` : ''}`.slice(0, 120)
}

/** Fotos y videos de una publicación de X (vacío si no existe, es sensible o la API no responde). */
export async function mediosDePublicacionX(url, { transporte = globalThis.fetch, timeout = 20_000 } = {}) {
  const pub = publicacionX(url)
  if (!pub) return null
  const respuesta = await transporte(`${API}/${pub.usuario}/status/${pub.id}`, { headers: { 'user-agent': AGENTE, accept: 'application/json' }, signal: AbortSignal.timeout(timeout) })
  if (!respuesta.ok) return null
  const datos = await respuesta.json().catch(() => null)
  const tweet = datos?.tweet
  if (!tweet || tweet.possibly_sensitive) return null
  const autor = String(tweet.author?.screen_name || pub.usuario)
  const fotos = (tweet.media?.photos || []).filter(f => f?.url).map(f => ({ url: String(f.url), ancho: Number(f.width) || 0, alto: Number(f.height) || 0 }))
  const videos = (tweet.media?.videos || []).filter(v => v?.url && (/\.mp4(\?|$)/i.test(String(v.url)) || v.format === 'video/mp4'))
    .map(v => ({ url: String(v.url), duracion: Number(v.duration) || 0, ancho: Number(v.width) || 0, alto: Number(v.height) || 0, poster: String(v.thumbnail_url || '') }))
  return { ...pub, autor, texto: String(tweet.text || ''), fecha: tweet.created_at || null, fotos, videos }
}
