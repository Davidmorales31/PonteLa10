import {
  alternarSlugEquipoSeguido,
  esSlugEquipoSeguible,
  normalizarSlugsEquiposSeguidos
} from '~/utils/seguimientoEquipos'

const claveAlmacenamiento = 'pont3la10:equipos-seguidos:v1'

export function useSeguimientoEquipos() {
  const equiposSeguidos = useState<string[]>('equipos-seguidos', () => [])
  const seguimientoEquiposHidratado = useState<boolean>('seguimiento-equipos-hidratado', () => false)

  onMounted(() => {
    if (seguimientoEquiposHidratado.value) return

    try {
      const guardados = localStorage.getItem(claveAlmacenamiento)
      equiposSeguidos.value = normalizarSlugsEquiposSeguidos(guardados ? JSON.parse(guardados) : [])
    } catch {
      equiposSeguidos.value = []
    }
    seguimientoEquiposHidratado.value = true
  })

  watch(equiposSeguidos, (slugs) => {
    if (!import.meta.client || !seguimientoEquiposHidratado.value) return

    try {
      localStorage.setItem(claveAlmacenamiento, JSON.stringify(slugs))
    } catch {
      // La preferencia sigue activa durante la sesión aunque el navegador no permita guardarla.
    }
  }, { deep: true })

  function estaSiguiendo(slug: string): boolean {
    return esSlugEquipoSeguible(slug) && equiposSeguidos.value.includes(slug)
  }

  function alternarSeguimiento(slug: string): boolean {
    if (!esSlugEquipoSeguible(slug)) return false

    const siguiendo = estaSiguiendo(slug)
    const actualizados = alternarSlugEquipoSeguido(equiposSeguidos.value, slug)
    if (!siguiendo && actualizados.length === equiposSeguidos.value.length) return false

    equiposSeguidos.value = actualizados
    return !siguiendo
  }

  return { equiposSeguidos, seguimientoEquiposHidratado, estaSiguiendo, alternarSeguimiento }
}
