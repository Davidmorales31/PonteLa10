export default defineNuxtRouteMiddleware(async (to) => {
  const { autenticacionConfigurada } = useAutenticacionEditorial()
  const {
    cargarContextoEditorial,
    codigoErrorContexto
  } = useContextoEditorial()

  if (!autenticacionConfigurada.value) {
    return navigateTo('/login?motivo=configuracion')
  }

  const contexto = await cargarContextoEditorial()

  if (!contexto && codigoErrorContexto.value === 'SESION_REQUERIDA') {
    return navigateTo(`/login?redirigir=${encodeURIComponent(to.fullPath)}`)
  }

  if (!contexto) {
    return navigateTo('/acceso-denegado')
  }

  const permisoRequerido = to.meta.permisoEditorial as
    | import('~/types/editorial').PermisoEditorial
    | undefined

  if (permisoRequerido && !contexto.permisos.includes(permisoRequerido)) {
    return navigateTo('/acceso-denegado')
  }

  const esRutaSeguridad = to.path === '/admin/seguridad'

  if (contexto.requiereMfa && contexto.nivelAal !== 'aal2' && !esRutaSeguridad) {
    return navigateTo('/admin/seguridad?motivo=mfa')
  }
})
