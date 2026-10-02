import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'

/** Solo se publican escudos HTTPS del CDN oficial del proveedor correspondiente. */
export function normalizarUrlInsigniaFutbol(valor: unknown, proveedor: IdentificadorProveedorFutbol): string | null {
  if (typeof valor !== 'string' || valor.length > 500) return null

  try {
    const url = new URL(valor)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    const hostPermitido = proveedor === 'api-football'
      ? host === 'media.api-sports.io'
      : host === 'goal-api.com' || host.endsWith('.goal-api.com')

    if (url.protocol !== 'https:' || !hostPermitido || url.username || url.password || url.port) return null
    return url.toString()
  } catch {
    return null
  }
}
