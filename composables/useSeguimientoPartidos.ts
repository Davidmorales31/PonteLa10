import type { PartidoResultado } from '~/types/resultados'

const claveAlmacenamiento = 'pont3la10:partidos-seguidos'

export function useSeguimientoPartidos() {
  const partidosSeguidos = useState<string[]>('partidos-seguidos', () => [])
  const seguimientoHidratado = useState<boolean>('seguimiento-hidratado', () => false)

  onMounted(() => {
    if (seguimientoHidratado.value) return

    try {
      const guardados = localStorage.getItem(claveAlmacenamiento)
      partidosSeguidos.value = guardados ? JSON.parse(guardados) : []
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
    partidosSeguidos.value = siguiendo
      ? partidosSeguidos.value.filter(id => id !== partido.id)
      : [...partidosSeguidos.value, partido.id]

    if (!siguiendo && import.meta.client && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    return !siguiendo
  }

  function notificarCambioMarcador(partido: PartidoResultado) {
    if (!import.meta.client || !estaSiguiendo(partido.id) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    new Notification(`${partido.equipoLocal.nombre} ${partido.marcadorLocal ?? '-'} - ${partido.marcadorVisitante ?? '-'} ${partido.equipoVisitante.nombre}`, {
      body: partido.minuto ? `Marcador actualizado en el minuto ${partido.minuto}.` : 'El marcador acaba de cambiar.',
      icon: '/brand/pont3la10_logo_05_app_icon_favicon.png',
      tag: `partido-${partido.id}`
    })
  }

  return { partidosSeguidos, seguimientoHidratado, estaSiguiendo, alternarSeguimiento, notificarCambioMarcador }
}
