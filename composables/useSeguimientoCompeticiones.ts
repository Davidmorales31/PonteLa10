import {
  alternarSlugCompeticionSeguida,
  esSlugCompeticionSeguible,
  normalizarSlugsCompeticionesSeguidas
} from '~/utils/seguimientoCompeticiones'

const claveAlmacenamiento = 'pont3la10:competiciones-seguidas:v1'

export function useSeguimientoCompeticiones() {
  const competicionesSeguidas = useState<string[]>('competiciones-seguidas', () => [])
  const seguimientoCompeticionesHidratado = useState<boolean>('seguimiento-competiciones-hidratado', () => false)

  onMounted(() => {
    if (seguimientoCompeticionesHidratado.value) return

    try {
      const guardadas = localStorage.getItem(claveAlmacenamiento)
      competicionesSeguidas.value = normalizarSlugsCompeticionesSeguidas(guardadas ? JSON.parse(guardadas) : [])
    } catch {
      competicionesSeguidas.value = []
    }
    seguimientoCompeticionesHidratado.value = true
  })

  watch(competicionesSeguidas, (slugs) => {
    if (!import.meta.client || !seguimientoCompeticionesHidratado.value) return

    try {
      localStorage.setItem(claveAlmacenamiento, JSON.stringify(slugs))
    } catch {
      // La preferencia sigue activa durante la sesión aunque el navegador no permita guardarla.
    }
  }, { deep: true })

  function estaSiguiendo(slug: string): boolean {
    return esSlugCompeticionSeguible(slug) && competicionesSeguidas.value.includes(slug)
  }

  function alternarSeguimiento(slug: string): boolean {
    if (!esSlugCompeticionSeguible(slug)) return false

    const siguiendo = estaSiguiendo(slug)
    const actualizadas = alternarSlugCompeticionSeguida(competicionesSeguidas.value, slug)
    if (!siguiendo && actualizadas.length === competicionesSeguidas.value.length) return false

    competicionesSeguidas.value = actualizadas
    return !siguiendo
  }

  return { competicionesSeguidas, seguimientoCompeticionesHidratado, estaSiguiendo, alternarSeguimiento }
}
