import { normalizarIdSitio, sitioDesdeHost } from '~/utils/sitio'
import { rutaNoDisponibleEnSitio } from '~/utils/rutasPorSitio'

export default defineNuxtRouteMiddleware((to) => {
  // Se usa `to` (no useRoute) porque en un middleware la ruta activa todavía es la anterior.
  const delDominio = sitioDesdeHost(useRequestURL().host)
  const id = import.meta.dev && to.query.sitio ? normalizarIdSitio(to.query.sitio, delDominio) : delDominio
  if (rutaNoDisponibleEnSitio(to.path, id)) {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Página no encontrada' }))
  }
})
