import {
  esRutaPublicaMedible,
  normalizarCategoriaMedible,
  type ContextoAnaliticaPagina,
  type EstadoAnaliticaPublica
} from '~/utils/analiticaPublica'

export default defineNuxtPlugin((nuxtApp) => {
  const analitica = useAnaliticaPublica()
  const router = useRouter()
  const contextoPagina = useState<ContextoAnaliticaPagina | null>('contexto-analitica-pagina', () => null)
  let ultimaRutaMedida = ''

  async function medirRuta(ruta: typeof router.currentRoute.value) {
    if (analitica.decision.value !== 'aceptada') return
    if (!esRutaPublicaMedible(ruta.path)) {
      ultimaRutaMedida = ''
      return
    }

    const contextoActual = contextoPagina.value
    const requiereContexto = /^\/(?:partidos|articulos)\//.test(ruta.path)
    if (requiereContexto && contextoActual?.ruta !== ruta.path) return

    if (ruta.path !== ultimaRutaMedida) {
      ultimaRutaMedida = ruta.path
      await analitica.registrarVistaPagina(
        ruta.path,
        ruta.query,
        contextoActual?.ruta === ruta.path ? contextoActual : null
      )
    }
  }

  router.afterEach(async (destino, origen) => {
    await medirRuta(destino)
    if (analitica.decision.value !== 'aceptada' || destino.path !== '/articulos') return

    const busquedaNueva = typeof destino.query.buscar === 'string' ? destino.query.buscar.trim() : ''
    const busquedaAnterior = typeof origen.query.buscar === 'string' ? origen.query.buscar.trim() : ''
    if (busquedaNueva && busquedaNueva !== busquedaAnterior) {
      await analitica.registrarEvento('search')
    }

    const categoriaNueva = normalizarCategoriaMedible(destino.query.categoria)
    const categoriaAnterior = normalizarCategoriaMedible(origen.query.categoria)
    if (categoriaNueva && categoriaNueva !== categoriaAnterior) {
      await analitica.registrarEvento('category_filter', categoriaNueva)
    }
  })

  watch(analitica.decision, (decision: EstadoAnaliticaPublica) => {
    if (decision === 'aceptada') {
      void medirRuta(router.currentRoute.value)
    } else {
      ultimaRutaMedida = ''
    }
  })

  watch(contextoPagina, (contexto) => {
    const rutaActual = router.currentRoute.value
    if (contexto?.ruta === rutaActual.path) {
      void medirRuta(rutaActual)
    }
  })

  nuxtApp.hook('app:mounted', () => {
    analitica.inicializarConsentimiento()
    void router.isReady().then(() => medirRuta(router.currentRoute.value))
  })
})
