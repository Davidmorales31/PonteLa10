import { getQuery, getRequestHost, type H3Event } from 'h3'
import { esIdSitio, sitioDesdeHost, type IdSitio } from '~/utils/sitio'

/**
 * Sitio al que pertenece una petición pública. Solo sirve para elegir qué contenido
 * público se lee: la autorización de las rutas privadas nunca depende de esta función
 * (el host y la consulta los puede escribir el cliente).
 *
 * `?sitio=mx` tiene prioridad sobre el host: cuando el servidor de la portada llama a
 * una API en otro origen (NUXT_PUBLIC_API_ORIGIN) el host original se pierde, y la
 * consulta también forma parte de la clave de caché.
 */
export function sitioDeSolicitud(evento: H3Event): IdSitio {
  const forzado = getQuery(evento).sitio
  if (esIdSitio(forzado)) return forzado
  return sitioDesdeHost(getRequestHost(evento, { xForwardedHost: true }))
}
