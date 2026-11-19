import { getRequestHost, type H3Event } from 'h3'
import { sitioDesdeHost, type IdSitio } from '~/utils/sitio'

/**
 * Sitio al que pertenece una petición pública. Solo sirve para elegir qué contenido
 * público se lee: la autorización de las rutas privadas nunca depende de esta función
 * (el host lo puede escribir el cliente).
 */
export function sitioDeSolicitud(evento: H3Event): IdSitio {
  return sitioDesdeHost(getRequestHost(evento, { xForwardedHost: true }))
}
