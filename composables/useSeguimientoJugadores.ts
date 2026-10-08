import {
  alternarSlugJugadorSeguido,
  esSlugJugadorSeguible,
  normalizarSlugsJugadoresSeguidos
} from '~/utils/seguimientoJugadores'

const claveAlmacenamiento = 'pont3la10:jugadores-seguidos:v1'

export function useSeguimientoJugadores() {
  const jugadoresSeguidos = useState<string[]>('jugadores-seguidos', () => [])
  const seguimientoJugadoresHidratado = useState<boolean>('seguimiento-jugadores-hidratado', () => false)

  onMounted(() => {
    if (seguimientoJugadoresHidratado.value) return

    try {
      const guardados = localStorage.getItem(claveAlmacenamiento)
      jugadoresSeguidos.value = normalizarSlugsJugadoresSeguidos(guardados ? JSON.parse(guardados) : [])
    } catch {
      jugadoresSeguidos.value = []
    }
    seguimientoJugadoresHidratado.value = true
  })

  watch(jugadoresSeguidos, (slugs) => {
    if (!import.meta.client || !seguimientoJugadoresHidratado.value) return

    try {
      localStorage.setItem(claveAlmacenamiento, JSON.stringify(slugs))
    } catch {
      // La preferencia sigue activa durante la sesión aunque el navegador no permita guardarla.
    }
  }, { deep: true })

  function estaSiguiendo(slug: string): boolean {
    return esSlugJugadorSeguible(slug) && jugadoresSeguidos.value.includes(slug)
  }

  function alternarSeguimiento(slug: string): boolean {
    if (!esSlugJugadorSeguible(slug)) return false

    const siguiendo = estaSiguiendo(slug)
    const actualizados = alternarSlugJugadorSeguido(jugadoresSeguidos.value, slug)
    if (!siguiendo && actualizados.length === jugadoresSeguidos.value.length) return false

    jugadoresSeguidos.value = actualizados
    return !siguiendo
  }

  return { jugadoresSeguidos, seguimientoJugadoresHidratado, estaSiguiendo, alternarSeguimiento }
}
