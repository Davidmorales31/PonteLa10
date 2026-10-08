import { isIP } from 'node:net'

const segmentosPrivados = new Set([
  'acceso-denegado',
  'account',
  'admin',
  'api',
  'auth',
  'cuenta',
  'login',
  'oauth',
  'recuperar-contrasena',
  'reset-password',
  'sesion'
])

const extensionRecurso = /\.(?:avif|bmp|css|gif|ico|jpe?g|js|json|map|pdf|png|svg|txt|webp|woff2?|xml|zip)$/i
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
const correo = /^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/

function esDireccionIp(valor: string): boolean {
  const sinCorchetes = valor.startsWith('[') && valor.endsWith(']') ? valor.slice(1, -1) : valor
  const sinZona = sinCorchetes.split('%', 1)[0]
  return isIP(sinZona) !== 0
}

/**
 * Devuelve una ruta de página segura para observabilidad; nunca incluye query,
 * fragmento, credenciales ni segmentos que parezcan identificadores privados.
 */
export function normalizarRutaPublica404(entrada: string | null | undefined): string | null {
  if (!entrada || entrada.length > 2_048) return null

  let pathname: string
  try {
    pathname = new URL(entrada, 'https://pont3la10.invalid').pathname
  } catch {
    return null
  }

  let decodificada: string
  try {
    decodificada = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const contieneControl = [...decodificada].some((caracter) => {
    const codigo = caracter.codePointAt(0) || 0
    return codigo < 0x20 || (codigo >= 0x7f && codigo <= 0x9f)
  })
  if (contieneControl || decodificada.includes('\\')) return null

  const segmentos = decodificada.split('/').filter(Boolean)
  if (segmentos.length === 0) return '/'
  if (segmentos[0] && segmentosPrivados.has(segmentos[0].toLocaleLowerCase('en'))) return null
  if (extensionRecurso.test(segmentos.at(-1) || '')) return null

  const ruta = `/${segmentos.map((segmento) => {
    const valor = segmento.normalize('NFC')
    if (correo.test(valor)) return ':redacted'
    if (esDireccionIp(valor)) return ':redacted'
    if (uuid.test(valor) || /^\d{6,}$/.test(valor)) return ':id'
    if (valor.length > 80 || /^[\da-z]{32,}$/i.test(valor)) return ':redacted'
    return encodeURIComponent(valor)
  }).join('/')}`

  return ruta.length <= 512 ? ruta : null
}

/** Solo se guarda la ruta de un referer HTTPS del dominio canónico configurado. */
export function obtenerRefererPublico404(
  referer: string | null | undefined,
  origenCanonico: string | null | undefined
): string | null {
  if (!referer || referer.length > 2_048 || !origenCanonico) return null

  try {
    const referencia = new URL(referer)
    const origen = new URL(origenCanonico)
    if (referencia.protocol !== 'https:' || origen.protocol !== 'https:') return null
    if (referencia.username || referencia.password || referencia.origin !== origen.origin) return null
    return normalizarRutaPublica404(referencia.pathname)
  } catch {
    return null
  }
}
