import {
  esRutaPublicaMedible,
  ID_MEDICION_GA4,
  normalizarCategoriaMedible,
  resolverDecisionAnalitica,
  resolverDecisionPublicidad
} from '~/utils/analiticaPublica'
import type { EstadoAnaliticaPublica } from '~/utils/analiticaPublica'

type EventoAnalitica =
  | 'article_view'
  | 'search'
  | 'category_filter'
  | 'match_page_view'
  | 'result_page_view'
  | 'watch_live_click'
  | 'channel_click'
  | 'internal_match_link_click'

declare global {
  interface Window {
    dataLayer?: unknown[][]
    gtag?: (...argumentos: unknown[]) => void
  }
}

const CLAVE_CONSENTIMIENTO = 'pont3la10:consentimiento-analitica:v1'
const CLAVE_CONSENTIMIENTO_PUBLICIDAD = 'pont3la10:consentimiento-publicidad:v1'
const CATEGORIAS_CONSENTIMIENTO = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
} as const
let promesaCargaEtiqueta: Promise<boolean> | null = null
let idEtiquetaCargada = ''

function borrarCookiesAnalitica() {
  const host = window.location.hostname
  const dominios = host === 'localhost' || host === '127.0.0.1'
    ? [undefined]
    : [undefined, host, `.${host}`, 'pont3la10.com', '.pont3la10.com']

  document.cookie.split(';').forEach((cookie) => {
    const nombre = cookie.split('=')[0]?.trim()
    if (!nombre || !/^_ga(?:_|$)/.test(nombre)) return
    dominios.forEach((dominio) => {
      const atributoDominio = dominio ? `; domain=${dominio}` : ''
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${atributoDominio}; SameSite=Lax`
    })
  })
}

export function useAnaliticaPublica() {
  const idMedicion = ID_MEDICION_GA4
  const disponible = computed(() => Boolean(idMedicion))
  const decision = useState<EstadoAnaliticaPublica>('decision-analitica-publica', () => null)
  const decisionPublicidad = useState<EstadoAnaliticaPublica>('decision-publicidad-publica', () => null)
  const listo = useState('consentimiento-analitica-listo', () => false)
  const preferenciasAbiertas = useState('preferencias-analitica-abiertas', () => false)
  const etiquetaLista = useState('google-analytics-etiqueta-lista', () => false)

  function inicializarConsentimiento() {
    if (!import.meta.client || listo.value) return

    try {
      const valorGuardado = window.localStorage.getItem(CLAVE_CONSENTIMIENTO)
      decision.value = resolverDecisionAnalitica(valorGuardado)
      const publicidadGuardada = window.localStorage.getItem(CLAVE_CONSENTIMIENTO_PUBLICIDAD)
      decisionPublicidad.value = resolverDecisionPublicidad(publicidadGuardada)
    } catch {
      // Si el almacenamiento está bloqueado, la medición rige solo esta sesión.
      decisionPublicidad.value = null
    }

    listo.value = true
  }

  function guardarDecision(nuevaDecision: Exclude<EstadoAnaliticaPublica, null>) {
    decision.value = nuevaDecision
    preferenciasAbiertas.value = false
    try {
      window.localStorage.setItem(CLAVE_CONSENTIMIENTO, nuevaDecision)
    } catch {
      // La elección explícita rige la sesión actual aunque no pueda persistirse.
    }
  }

  function guardarDecisionPublicidad(nuevaDecision: Exclude<EstadoAnaliticaPublica, null>) {
    decisionPublicidad.value = nuevaDecision
    preferenciasAbiertas.value = false
    try {
      window.localStorage.setItem(CLAVE_CONSENTIMIENTO_PUBLICIDAD, nuevaDecision)
    } catch {
      // Sin almacenamiento disponible, el permiso rige solo esta sesión.
    }
  }

  function encolarGtag(...argumentos: unknown[]) {
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || []
      window.gtag = (...nuevosArgumentos: unknown[]) => {
        window.dataLayer?.push(nuevosArgumentos)
      }
    }
    window.gtag(...argumentos)
  }

  function revocarEtiqueta() {
    etiquetaLista.value = false
    if (!import.meta.client) return
    if (window.gtag && idEtiquetaCargada) {
      encolarGtag('consent', 'update', CATEGORIAS_CONSENTIMIENTO)
    }
    borrarCookiesAnalitica()
  }

  function cargarEtiqueta(): Promise<boolean> {
    if (!import.meta.client || !idMedicion || decision.value !== 'aceptada') {
      return Promise.resolve(false)
    }

    if (idEtiquetaCargada === idMedicion && etiquetaLista.value) {
      return Promise.resolve(true)
    }

    if (idEtiquetaCargada === idMedicion && window.gtag) {
      encolarGtag('consent', 'update', { ...CATEGORIAS_CONSENTIMIENTO, analytics_storage: 'granted' })
      etiquetaLista.value = true
      return Promise.resolve(true)
    }

    if (promesaCargaEtiqueta) return promesaCargaEtiqueta

    promesaCargaEtiqueta = new Promise<boolean>((resolver) => {
      encolarGtag('consent', 'default', CATEGORIAS_CONSENTIMIENTO)
      encolarGtag('js', new Date())
      encolarGtag('config', idMedicion, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      })

      const script = document.createElement('script')
      script.async = true
      script.dataset.pont3la10Analytics = 'ga4'
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(idMedicion)}`
      script.onload = () => {
        promesaCargaEtiqueta = null
        idEtiquetaCargada = idMedicion
        const tieneConsentimiento = decision.value === 'aceptada'
        encolarGtag('consent', 'update', {
          ...CATEGORIAS_CONSENTIMIENTO,
          analytics_storage: tieneConsentimiento ? 'granted' : 'denied'
        })
        etiquetaLista.value = tieneConsentimiento
        if (!tieneConsentimiento) borrarCookiesAnalitica()
        resolver(tieneConsentimiento)
      }
      script.onerror = () => {
        promesaCargaEtiqueta = null
        script.remove()
        resolver(false)
      }
      document.head.appendChild(script)
    })

    return promesaCargaEtiqueta
  }

  async function registrarVistaPagina(ruta: string) {
    if (!idMedicion || !esRutaPublicaMedible(ruta) || !(await cargarEtiqueta())) return
    if (decision.value !== 'aceptada') return

    const rutaSinParametros = ruta.split(/[?#]/, 1)[0] || '/'
    encolarGtag('event', 'page_view', {
      page_location: `${window.location.origin}${rutaSinParametros}`,
      page_path: rutaSinParametros
    })
  }

  async function registrarEvento(nombre: EventoAnalitica, categoria?: unknown) {
    if (!idMedicion || !(await cargarEtiqueta()) || decision.value !== 'aceptada') return

    if (nombre === 'category_filter') {
      const categoriaSegura = normalizarCategoriaMedible(categoria)
      if (!categoriaSegura) return
      encolarGtag('event', nombre, { category: categoriaSegura })
      return
    }

    encolarGtag('event', nombre)
  }

  function aceptarAnalitica() {
    guardarDecision('aceptada')
    void cargarEtiqueta()
  }

  function rechazarAnalitica() {
    guardarDecision('rechazada')
    revocarEtiqueta()
  }

  function aceptarPublicidad() {
    guardarDecisionPublicidad('aceptada')
  }

  function rechazarPublicidad() {
    guardarDecisionPublicidad('rechazada')
  }

  function abrirPreferencias() {
    preferenciasAbiertas.value = true
  }

  function cerrarPreferencias() {
    if (decisionPublicidad.value === null) {
      guardarDecisionPublicidad('rechazada')
      return
    }
    preferenciasAbiertas.value = false
  }

  const mostrarAviso = computed(() =>
    listo.value
    && (decisionPublicidad.value === null || preferenciasAbiertas.value)
  )
  const publicidadAutorizada = computed(() => decisionPublicidad.value === 'aceptada')

  return {
    disponible,
    decision,
    decisionPublicidad,
    publicidadAutorizada,
    listo,
    mostrarAviso,
    preferenciasAbiertas,
    aceptarAnalitica,
    rechazarAnalitica,
    aceptarPublicidad,
    rechazarPublicidad,
    abrirPreferencias,
    cerrarPreferencias,
    inicializarConsentimiento,
    registrarVistaPagina,
    registrarEvento
  }
}
