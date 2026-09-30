import {
  esRutaPublicaMedible,
  normalizarCategoriaMedible,
  type EstadoAnaliticaPublica
} from '~/utils/analiticaPublica'
import { leerPaginaDesdeRutaArticulos } from '~/utils/paginacionArticulos'

export default defineNuxtPlugin((nuxtApp) => {
  const analitica = useAnaliticaPublica()
  const router = useRouter()
  let ultimaRutaMedida = ''

  async function medirRuta(ruta: typeof router.currentRoute.value) {
    if (analitica.decision.value !== 'aceptada') return
    if (!esRutaPublicaMedible(ruta.path)) {
      ultimaRutaMedida = ''
      return
    }

    if (ruta.path !== ultimaRutaMedida) {
      ultimaRutaMedida = ruta.path
      await analitica.registrarVistaPagina(ruta.path)
      if (leerPaginaDesdeRutaArticulos(ruta.path) !== null) {
        await analitica.registrarEvento('pagination_view')
      }
    }
  }

  router.afterEach(async (destino, origen) => {
    await medirRuta(destino)
    if (analitica.decision.value !== 'aceptada') return

    const paginaDestino = leerPaginaDesdeRutaArticulos(destino.path)
    const paginaOrigen = leerPaginaDesdeRutaArticulos(origen.path)
    if (paginaDestino !== null && paginaOrigen !== null && paginaDestino === paginaOrigen + 1) {
      await analitica.registrarEvento('pagination_next')
    }

    if (destino.path !== '/articulos') return

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

  nuxtApp.hook('app:mounted', () => {
    analitica.inicializarConsentimiento()
    void router.isReady().then(() => medirRuta(router.currentRoute.value))
  })
})
