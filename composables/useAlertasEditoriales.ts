export type TipoAlertaEditorial = 'exito' | 'error' | 'advertencia'

export interface AlertaEditorial {
  id: string
  tipo: TipoAlertaEditorial
  titulo: string
  mensaje: string
}

export function useAlertasEditoriales() {
  const alertas = useState<AlertaEditorial[]>('editorial:alertas', () => [])

  function mostrarAlerta(entrada: Omit<AlertaEditorial, 'id'>) {
    const alerta = {
      ...entrada,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
    alertas.value = [...alertas.value, alerta]
    return alerta.id
  }

  function cerrarAlerta(id: string) {
    alertas.value = alertas.value.filter(alerta => alerta.id !== id)
  }

  return { alertas, mostrarAlerta, cerrarAlerta }
}
