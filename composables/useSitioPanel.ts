import { configuracionSitios, cookieSitioPanel, idsSitio, normalizarIdSitio, sitioDesdeHost, type IdSitio } from '~/utils/sitio'

/** Sitio que se está administrando en el panel (se recuerda en una cookie). */
export function useSitioPanel() {
  const cookie = useCookie<string | null>(cookieSitioPanel, {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: !import.meta.dev
  })
  const sitioDelDominio = sitioDesdeHost(useRequestURL().host)
  const sitioPanel = computed<IdSitio>(() => normalizarIdSitio(cookie.value, sitioDelDominio))
  const opciones = idsSitio.map(id => ({ id, nombre: configuracionSitios[id].pais }))

  function cambiarSitio(id: unknown) {
    cookie.value = normalizarIdSitio(id, sitioPanel.value)
    // Todo lo que muestra el panel depende del sitio: se recarga limpio.
    reloadNuxtApp({ persistState: false })
  }

  return { sitioPanel, opciones, cambiarSitio, // Colombia es este mismo origen; México tiene su propio dominio.
    origen: computed(() => sitioPanel.value === 'co' ? '/' : configuracionSitios[sitioPanel.value].origen) }
}
