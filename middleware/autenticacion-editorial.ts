export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const { autenticacionConfigurada, obtenerSesionActual } = useAutenticacionEditorial()

  if (!autenticacionConfigurada.value) {
    return navigateTo('/admin/login?motivo=configuracion')
  }

  const sesion = await obtenerSesionActual()

  if (!sesion) {
    return navigateTo(`/admin/login?redirigir=${encodeURIComponent(to.fullPath)}`)
  }
})
