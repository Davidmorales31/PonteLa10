import type { PartidoResultado } from '~/types/resultados'
import {
  alternarIdPartido,
  cambioMarcador,
  crearContenidoNotificacionMarcador
} from '~/utils/seguimientoPartidos'

const claveAlmacenamiento = 'pont3la10:partidos-seguidos'

export function useSeguimientoPartidos() {
  const partidosSeguidos = useState<string[]>('partidos-seguidos', () => [])
  const seguimientoHidratado = useState<boolean>('seguimiento-hidratado', () => false)

  onMounted(() => {
    if (seguimientoHidratado.value) return

    try {
      const guardados = localStorage.getItem(claveAlmacenamiento)
      const idsGuardados: unknown = guardados ? JSON.parse(guardados) : []
      partidosSeguidos.value = Array.isArray(idsGuardados)
        ? [...new Set(idsGuardados.filter((id): id is string => typeof id === 'string'))]
        : []
    } catch {
      partidosSeguidos.value = []
    }
    seguimientoHidratado.value = true
  })

  watch(partidosSeguidos, (ids) => {
    if (import.meta.client && seguimientoHidratado.value) {
      localStorage.setItem(claveAlmacenamiento, JSON.stringify(ids))
    }
  }, { deep: true })

  function estaSiguiendo(idPartido: string): boolean {
    return partidosSeguidos.value.includes(idPartido)
  }

  async function alternarSeguimiento(partido: PartidoResultado): Promise<boolean> {
    const siguiendo = estaSiguiendo(partido.id)
    partidosSeguidos.value = alternarIdPartido(partidosSeguidos.value, partido.id)

    if (!siguiendo && import.meta.client && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        // El seguimiento local sigue funcionando aunque el navegador bloquee el permiso.
      }
    }

    return !siguiendo
  }

  function notificarCambioMarcador(partidoAnterior: PartidoResultado, partidoActual: PartidoResultado) {
    if (!cambioMarcador(partidoAnterior, partidoActual)) return
    if (!import.meta.client || !estaSiguiendo(partidoActual.id) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const contenido = crearContenidoNotificacionMarcador(partidoAnterior, partidoActual)
    new Notification(contenido.titulo, {
      body: contenido.cuerpo,
      icon: '/brand/pont3la10_logo_05_app_icon_favicon.png',
      tag: `partido-${partidoActual.id}`
    })
  }

  return { partidosSeguidos, seguimientoHidratado, estaSiguiendo, alternarSeguimiento, notificarCambioMarcador }
}
