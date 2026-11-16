import { lookup } from 'node:dns'
import type { LookupAddress } from 'node:dns'
import { request } from 'node:https'
import { BlockList, isIP } from 'node:net'
import { errores } from './errores'

/** Rangos que jamás se consultan: red local, metadatos de la nube, documentación, multicast y direcciones traducidas. */
const bloqueadas = new BlockList()
for (const [red, prefijo] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) bloqueadas.addSubnet(red, prefijo, 'ipv4')
for (const [red, prefijo] of [['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001::', 32], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const) bloqueadas.addSubnet(red, prefijo, 'ipv6')

export function direccionPublica(direccion: string): boolean {
  const familia = isIP(direccion)
  if (!familia) return false
  // Las direcciones IPv4 mapeadas en IPv6 (::ffff:a.b.c.d, en cualquier notación) nunca son destinos válidos.
  if (familia === 6) { try { if (new URL(`http://[${direccion}]/`).hostname.startsWith('[::ffff:')) return false } catch { return false } }
  return !bloqueadas.check(direccion, familia === 4 ? 'ipv4' : 'ipv6')
}

/** Resuelve el nombre y rechaza el intento completo si CUALQUIER dirección es privada (evita DNS rebinding en la conexión real). */
function resolucionSegura(hostname: string, opciones: { all?: boolean, family?: number | string, hints?: number }, devolver: (...argumentos: unknown[]) => void) {
  lookup(hostname, { ...opciones, all: true } as never, (problema: NodeJS.ErrnoException | null, direcciones: LookupAddress[] | string) => {
    const lista = Array.isArray(direcciones) ? direcciones : []
    if (problema || !lista.length) return devolver(problema || new Error('Sin direcciones'))
    if (lista.some(direccion => !direccionPublica(direccion.address))) return devolver(new Error('Dirección no permitida'))
    if (opciones.all) return devolver(null, lista)
    return devolver(null, lista[0]!.address, lista[0]!.family)
  })
}

export function validarUrlPublica(texto: string): URL {
  let url: URL
  try { url = new URL(texto) } catch { throw errores.validacion('La URL no es válida.') }
  if (url.protocol !== 'https:') throw errores.validacion('Solo se admiten enlaces HTTPS.')
  if (url.username || url.password) throw errores.validacion('La URL no puede incluir credenciales.')
  if (url.port && url.port !== '443') throw errores.validacion('Solo se admite el puerto 443.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host) && !direccionPublica(host)) throw errores.validacion('La dirección de la URL no está permitida.')
  if (!isIP(host) && (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.'))) {
    throw errores.validacion('El servidor de la URL no está permitido.')
  }
  return url
}

const tiposImagen = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Descarga una imagen pública con límites estrictos: HTTPS, ≤3 redirecciones revalidadas, tamaño y tiempo acotados. */
export async function descargarImagenPublica(texto: string, opciones: { maxBytes: number, tiempoMs?: number, redirecciones?: number }) {
  let url = validarUrlPublica(texto)
  const limiteTiempo = Date.now() + (opciones.tiempoMs ?? 15_000)
  for (let salto = 0; salto <= (opciones.redirecciones ?? 3); salto++) {
    const respuesta = await pedir(url, opciones.maxBytes, limiteTiempo)
    if (respuesta.redireccion) { url = validarUrlPublica(new URL(respuesta.redireccion, url).toString()); continue }
    const tipo = (respuesta.tipo || '').split(';')[0]!.trim().toLowerCase()
    if (!tiposImagen.has(tipo)) throw errores.validacion('La URL no devuelve una imagen JPG, PNG o WebP.')
    return { buffer: respuesta.buffer, tipoMime: tipo as 'image/jpeg' | 'image/png' | 'image/webp', nombre: decodeURIComponent(url.pathname.split('/').pop() || 'imagen').slice(0, 120) || 'imagen' }
  }
  throw errores.validacion('La URL redirige demasiadas veces.')
}

function pedir(url: URL, maxBytes: number, limiteTiempo: number) {
  return new Promise<{ redireccion?: string, tipo?: string, buffer: Buffer }>((resolver, rechazar) => {
    const restante = limiteTiempo - Date.now()
    if (restante <= 0) return rechazar(errores.validacion('La descarga tardó demasiado.'))
    const peticion = request(url, { method: 'GET', lookup: resolucionSegura as never, timeout: restante,
      headers: { 'user-agent': 'Pont3la10-AgentesRedes/1', accept: 'image/jpeg,image/png,image/webp' } }, (respuesta) => {
      const estado = respuesta.statusCode || 0
      if ([301, 302, 303, 307, 308].includes(estado) && respuesta.headers.location) { respuesta.resume(); return resolver({ redireccion: String(respuesta.headers.location), buffer: Buffer.alloc(0) }) }
      if (estado !== 200) { respuesta.resume(); return rechazar(errores.validacion(`La URL respondió con el estado ${estado}.`)) }
      const declarado = Number(respuesta.headers['content-length'] || 0)
      if (declarado > maxBytes) { respuesta.destroy(); return rechazar(errores.validacion(`La imagen supera el máximo de ${Math.round(maxBytes / 1048576)} MB.`)) }
      const trozos: Buffer[] = []; let total = 0
      respuesta.on('data', (trozo: Buffer) => {
        total += trozo.length
        if (total > maxBytes) { respuesta.destroy(); rechazar(errores.validacion(`La imagen supera el máximo de ${Math.round(maxBytes / 1048576)} MB.`)); return }
        trozos.push(trozo)
      })
      respuesta.on('end', () => resolver({ tipo: String(respuesta.headers['content-type'] || ''), buffer: Buffer.concat(trozos) }))
      respuesta.on('error', () => rechazar(errores.validacion('Se interrumpió la descarga.')))
    })
    peticion.on('timeout', () => { peticion.destroy(); rechazar(errores.validacion('La descarga tardó demasiado.')) })
    peticion.on('error', () => rechazar(errores.validacion('No se pudo descargar la imagen de esa URL.')))
    peticion.end()
  })
}
