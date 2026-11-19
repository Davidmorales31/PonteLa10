import { getCookie, type H3Event } from 'h3'
import { cookieSitioPanel, esIdSitio, type IdSitio } from '~/utils/sitio'
import { sitioDeSolicitud } from '~/server/utils/sitioDeSolicitud'

/**
 * Sitio que el panel editorial está administrando (selector del panel). Solo decide qué
 * contenido se lista y en qué sitio se crea; los permisos se siguen comprobando aparte.
 * Sin selección válida usa el sitio del dominio desde el que se abrió el panel.
 */
export function sitioDelPanel(evento: H3Event): IdSitio {
  const elegido = getCookie(evento, cookieSitioPanel)
  return esIdSitio(elegido) ? elegido : sitioDeSolicitud(evento)
}
