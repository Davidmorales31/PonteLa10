// Acceso remoto al estudio de video (fase 1 del plan del iPhone, docs/PLAN_ESTUDIO_IPHONE.md).
// En el PC (localhost) el estudio sigue como siempre. Desde fuera solo entra por los hosts HTTPS que diga
// VIDEO_ESTUDIO_HOSTS_REMOTOS (por ejemplo el nombre *.ts.net que da `tailscale serve`) y con una clave propia.
// La clave se guarda con scrypt en ~/.pont3la10/estudio/acceso.json; la sesión es una cookie firmada con HMAC.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const COOKIE_SESION = 'estudio_sesion'
export const DURACION_SESION_MS = 30 * 24 * 3_600_000
export const CLAVE_MINIMA = 8
export const INTENTOS_MAXIMOS = 5
export const BLOQUEO_MS = 15 * 60_000

export function dirAcceso(entorno = process.env) {
  return entorno.PONT3LA10_ESTUDIO_ACCESO_DIR || join(homedir(), '.pont3la10', 'estudio')
}

/** Hosts remotos permitidos (sin esquema ni puerto): los de acceso.json más los de VIDEO_ESTUDIO_HOSTS_REMOTOS. */
export function hostsRemotos(entorno = process.env, config = null) {
  return [...String(entorno.VIDEO_ESTUDIO_HOSTS_REMOTOS || '').split(','), ...(Array.isArray(config?.hostsRemotos) ? config.hostsRemotos : [])]
    .map(h => String(h).trim().toLowerCase()).filter(h => /^[a-z0-9.-]{3,253}$/.test(h))
}

/** Usuarios de Tailscale permitidos (opcional). Vacío = cualquiera de tu red privada que tenga la clave. */
export function usuariosTailscale(entorno = process.env) {
  return String(entorno.VIDEO_ESTUDIO_USUARIOS_TS || '').split(',').map(u => u.trim().toLowerCase()).filter(Boolean)
}

/** Cabeceras que pone un proxy (tailscale serve, Cloudflare…): si llega alguna, la petición NO es del PC. */
export function esReenviada(cabeceras = {}) {
  return ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'forwarded', 'tailscale-user-login', 'tailscale-user-name', 'cf-connecting-ip']
    .some(nombre => cabeceras[nombre] !== undefined)
}

/**
 * Clasifica la petición: local (como siempre, sin clave), remota (exige sesión) o rechazada.
 * Una petición que trae cabeceras de proxy siempre es remota, aunque el proxy haya reescrito el Host a 127.0.0.1:
 * así nadie que llegue por el túnel se cuela como si estuviera sentado frente al PC.
 * Las escrituras exigen Origin del mismo sitio; las lecturas lo aceptan ausente (navegación directa).
 */
export function clasificarPeticion({ host, origin, metodo, reenviada = false, hostReenviado = '', usuarioTs = '' }, { puerto, remotos = [], usuarios = [] }) {
  const locales = [`127.0.0.1:${puerto}`, `localhost:${puerto}`]
  const valorHost = String(host || '').toLowerCase()
  const lectura = metodo === 'GET' || metodo === 'HEAD'
  if (!reenviada) {
    if (!locales.includes(valorHost)) return { permitido: false }
    const origenOk = !origin ? lectura : locales.some(h => origin === `http://${h}`)
    return origenOk ? { permitido: true, remota: false } : { permitido: false }
  }
  if (!remotos.length) return { permitido: false }
  // El nombre público puede venir en Host (si el proxy lo conserva) o en X-Forwarded-Host.
  const candidatos = [valorHost, String(hostReenviado || '').toLowerCase()].map(h => h.split(',')[0].trim().replace(/:443$/, ''))
  const nombre = candidatos.find(h => remotos.includes(h))
  if (!nombre && !locales.includes(valorHost)) return { permitido: false }
  const origenOk = !origin ? lectura : remotos.some(r => origin === `https://${r}`) && (!nombre || origin === `https://${nombre}`)
  if (!origenOk) return { permitido: false }
  if (usuarios.length && !usuarios.includes(String(usuarioTs || '').toLowerCase())) return { permitido: false }
  return { permitido: true, remota: true }
}

export function hashClave(clave, sal = randomBytes(16)) {
  const hash = scryptSync(String(clave).normalize('NFKC'), sal, 64)
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`
}

export function verificarClave(clave, guardado) {
  const [tipo, sal, hash] = String(guardado || '').split('$')
  if (tipo !== 'scrypt' || !sal || !hash) return false
  const esperado = Buffer.from(hash, 'base64')
  const calculado = scryptSync(String(clave ?? '').normalize('NFKC'), Buffer.from(sal, 'base64'), esperado.length)
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}

const firmar = (secreto, datos) => createHmac('sha256', secreto).update(datos).digest('base64url')

export function crearSesion(secreto, ahora = Date.now()) {
  const datos = `${randomBytes(12).toString('base64url')}.${ahora + DURACION_SESION_MS}`
  return `${datos}.${firmar(secreto, datos)}`
}

export function sesionValida(token, secreto, ahora = Date.now()) {
  const partes = String(token || '').split('.')
  if (partes.length !== 3 || !secreto) return false
  const datos = `${partes[0]}.${partes[1]}`
  const esperada = Buffer.from(firmar(secreto, datos))
  const recibida = Buffer.from(partes[2])
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return false
  return Number(partes[1]) > ahora
}

export function leerCookie(cabecera, nombre = COOKIE_SESION) {
  for (const parte of String(cabecera || '').split(';')) {
    const [clave, ...valor] = parte.trim().split('=')
    if (clave === nombre) return valor.join('=')
  }
  return ''
}

export const cookieSesion = token => `${COOKIE_SESION}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACION_SESION_MS / 1000}`
export const cookieSalida = () => `${COOKIE_SESION}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

/** Limitador global (hay un solo dueño): tras 5 fallos seguidos bloquea 15 minutos. */
export function crearLimitador({ maximos = INTENTOS_MAXIMOS, bloqueo = BLOQUEO_MS } = {}) {
  let fallos = 0
  let hasta = 0
  return {
    bloqueado: (ahora = Date.now()) => ahora < hasta,
    fallo(ahora = Date.now()) { fallos += 1; if (fallos >= maximos) { hasta = ahora + bloqueo; fallos = 0 } },
    exito() { fallos = 0; hasta = 0 }
  }
}

export const hostsRemotosValidos = lista => [...new Set((lista || []).map(h => String(h).trim().toLowerCase()).filter(h => /^[a-z0-9.-]{3,253}$/.test(h)))]

export async function leerConfiguracion(dir = dirAcceso()) {
  try { return JSON.parse(await readFile(join(dir, 'acceso.json'), 'utf8')) } catch { return null }
}

/** Guarda una clave nueva y rota el secreto de sesión (cierra todas las sesiones abiertas). Conserva los hosts remotos. */
export async function guardarClave(clave, dir = dirAcceso(), hosts = null) {
  if (String(clave || '').length < CLAVE_MINIMA) throw new Error(`La clave debe tener al menos ${CLAVE_MINIMA} caracteres.`)
  await mkdir(dir, { recursive: true })
  const anterior = await leerConfiguracion(dir)
  const hostsRemotos = hostsRemotosValidos(hosts ?? anterior?.hostsRemotos ?? [])
  const config = { hash: hashClave(clave), secreto: randomBytes(32).toString('base64'), hostsRemotos, actualizada: new Date().toISOString() }
  await writeFile(join(dir, 'acceso.json'), JSON.stringify(config, null, 2), { mode: 0o600 })
  return config
}

/** Auditoría de accesos remotos: una línea JSON por evento, sin claves ni cookies. */
export async function auditar(evento, dir = dirAcceso()) {
  try {
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'auditoria.log'), `${JSON.stringify({ en: new Date().toISOString(), ...evento })}\n`)
  } catch { /* la auditoría nunca tumba el estudio */ }
}

export const PAGINA_INGRESO = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Estudio · Ponte la 10</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b0c0f; color: #f2f2f2; font: 17px/1.4 system-ui, -apple-system, sans-serif; padding: 16px; box-sizing: border-box; }
  form { width: 100%; max-width: 360px; display: grid; gap: 14px; }
  h1 { font-size: 22px; margin: 0; }
  input, button { font: inherit; padding: 14px; border-radius: 10px; border: 1px solid #2a2c33; }
  input { background: #14161b; color: inherit; }
  button { background: #ffd800; color: #08204a; font-weight: 800; border: 0; }
  p { margin: 0; color: #f08a8a; min-height: 1.4em; }
</style></head>
<body><form id="f"><h1>Estudio de video</h1>
<input id="clave" type="password" autocomplete="current-password" placeholder="Clave del estudio" required minlength="${CLAVE_MINIMA}">
<button type="submit">Entrar</button><p id="msg" role="alert"></p></form>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault()
  const r = await fetch('/api/acceso/ingresar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave: document.getElementById('clave').value }) })
  if (r.ok) { location.href = '/'; return }
  const d = await r.json().catch(() => ({}))
  document.getElementById('msg').textContent = d.error || 'No se pudo entrar.'
})
</script></body></html>`
