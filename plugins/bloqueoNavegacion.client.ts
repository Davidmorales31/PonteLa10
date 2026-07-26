export default defineNuxtPlugin((nuxtApp) => {
  const {
    iniciarBloqueo,
    finalizarBloqueo
  } = useBloqueoInterfaz()

  nuxtApp.hook('page:start', () => {
    iniciarBloqueo('navegacion', 'Cargando página')
  })

  nuxtApp.hook('page:finish', () => {
    finalizarBloqueo('navegacion')
  })

  nuxtApp.hook('app:error', () => {
    finalizarBloqueo('navegacion')
  })
})
