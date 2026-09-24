export type TipoAlertaEditorial = 'exito' | 'error' | 'advertencia'

export interface AlertaEditorial {
  id: string
  tipo: TipoAlertaEditorial
  titulo: string
  mensaje: string
}

// La cola vive solo en el navegador. `window.setTimeout` devuelve `number`,
// a diferencia del temporizador de Node que el typecheck de CI también carga.
const temporizadores = new Map<string, number>()

export function useAlertasEditoriales() {
  const alertas = useState<AlertaEditorial[]>('editorial:alertas', () => [])

  function mostrarAlerta(entrada: Omit<AlertaEditorial, 'id'>) {
    const alerta = {
      ...entrada,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
    alertas.value = [...alertas.value, alerta]
    if (import.meta.client) {
      const duracion = entrada.tipo === 'error' ? 9000 : 6000
      temporizadores.set(alerta.id, window.setTimeout(() => cerrarAlerta(alerta.id), duracion))
    }
    return alerta.id
  }

  function cerrarAlerta(id: string) {
    const temporizador = temporizadores.get(id)
    if (temporizador) window.clearTimeout(temporizador)
    temporizadores.delete(id)
    alertas.value = alertas.value.filter(alerta => alerta.id !== id)
  }

  return { alertas, mostrarAlerta, cerrarAlerta }
}
