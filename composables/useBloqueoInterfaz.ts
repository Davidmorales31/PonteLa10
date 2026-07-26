export function useBloqueoInterfaz() {
  const operaciones = useState<Record<string, string>>(
    'interfaz:operacionesBloqueantes',
    () => ({})
  )

  const bloqueado = computed(() => Object.keys(operaciones.value).length > 0)
  const mensaje = computed(() => (
    Object.values(operaciones.value).at(-1) || 'Procesando solicitud'
  ))

  function iniciarBloqueo(clave: string, texto: string): boolean {
    if (operaciones.value[clave]) return false

    operaciones.value = {
      ...operaciones.value,
      [clave]: texto
    }
    return true
  }

  function finalizarBloqueo(clave: string) {
    operaciones.value = Object.fromEntries(
      Object.entries(operaciones.value)
        .filter(([claveActiva]) => claveActiva !== clave)
    )
  }

  async function ejecutarConBloqueo<Resultado>(
    clave: string,
    texto: string,
    operacion: () => Promise<Resultado>
  ): Promise<Resultado | undefined> {
    if (!iniciarBloqueo(clave, texto)) return undefined

    try {
      return await operacion()
    } finally {
      finalizarBloqueo(clave)
    }
  }

  function limpiarBloqueos() {
    operaciones.value = {}
  }

  return {
    operaciones,
    bloqueado,
    mensaje,
    iniciarBloqueo,
    finalizarBloqueo,
    ejecutarConBloqueo,
    limpiarBloqueos
  }
}
