import type { ContextoEditorial, PermisoEditorial } from '~/types/editorial'

interface ErrorPeticionEditorial {
  statusCode?: number
  data?: {
    codigo?: string
    data?: {
      codigo?: string
    }
  }
}

export function useContextoEditorial() {
  const duracionCacheContexto = 60_000
  const contextoEditorial = useState<ContextoEditorial | null>('editorial:contexto', () => null)
  const contextoCargadoEn = useState('editorial:contextoCargadoEn', () => 0)
  const cargandoContextoEditorial = useState('editorial:cargandoContexto', () => false)
  const errorContextoEditorial = useState<string | null>('editorial:errorContexto', () => null)
  const codigoErrorContexto = useState<string | null>('editorial:codigoErrorContexto', () => null)

  async function cargarContextoEditorial(forzar = false): Promise<ContextoEditorial | null> {
    const cacheVigente = Date.now() - contextoCargadoEn.value < duracionCacheContexto

    if (contextoEditorial.value && !forzar && cacheVigente) {
      return contextoEditorial.value
    }

    cargandoContextoEditorial.value = true
    errorContextoEditorial.value = null
    codigoErrorContexto.value = null

    try {
      const solicitar = useRequestFetch()
      contextoEditorial.value = await solicitar<ContextoEditorial>('/api/admin/contexto')
      contextoCargadoEn.value = Date.now()
      return contextoEditorial.value
    } catch (error) {
      const errorPeticion = error as ErrorPeticionEditorial
      contextoEditorial.value = null
      codigoErrorContexto.value = errorPeticion.data?.codigo
        || errorPeticion.data?.data?.codigo
        || null
      errorContextoEditorial.value = errorPeticion.statusCode === 401
        ? 'Debes iniciar sesión.'
        : 'Tu cuenta no tiene acceso al panel editorial.'
      return null
    } finally {
      cargandoContextoEditorial.value = false
    }
  }

  function tienePermiso(permiso: PermisoEditorial): boolean {
    return contextoEditorial.value?.permisos.includes(permiso) || false
  }

  function limpiarContextoEditorial() {
    contextoEditorial.value = null
    contextoCargadoEn.value = 0
    errorContextoEditorial.value = null
    codigoErrorContexto.value = null
  }

  return {
    contextoEditorial,
    contextoCargadoEn,
    cargandoContextoEditorial,
    errorContextoEditorial,
    codigoErrorContexto,
    cargarContextoEditorial,
    tienePermiso,
    limpiarContextoEditorial
  }
}
