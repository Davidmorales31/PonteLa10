export type TemaPublico = 'azul' | 'blanco'

const CLAVE_TEMA_PUBLICO = 'pont3la10:tema-publico'

export function useTemaPublico() {
  const tema = useState<TemaPublico>('tema-publico', () => 'azul')
  const inicializado = useState('tema-publico-inicializado', () => false)

  function aplicarClaseTema(nuevoTema: TemaPublico) {
    document.body.classList.remove('tema-publico-azul', 'tema-publico-blanco')
    document.body.classList.add(`tema-publico-${nuevoTema}`)
  }

  const modoBlancoActivo = computed(() => tema.value === 'blanco')
  const etiquetaAlternarTema = computed(() => modoBlancoActivo.value ? 'Modo azul' : 'Modo blanco')

  function establecerTema(nuevoTema: TemaPublico) {
    tema.value = nuevoTema
  }

  function alternarTema() {
    establecerTema(modoBlancoActivo.value ? 'azul' : 'blanco')
  }

  if (import.meta.client) {
    onMounted(() => {
      if (!inicializado.value) {
        try {
          const temaGuardado = window.localStorage.getItem(CLAVE_TEMA_PUBLICO)
          if (temaGuardado === 'azul' || temaGuardado === 'blanco') {
            tema.value = temaGuardado
          }
        } catch {
          // El tema predeterminado sigue disponible si el almacenamiento está bloqueado.
        }
        inicializado.value = true
      }

      aplicarClaseTema(tema.value)
    })

    watch(tema, (nuevoTema) => {
      try {
        window.localStorage.setItem(CLAVE_TEMA_PUBLICO, nuevoTema)
      } catch {
        // La preferencia de tema es opcional; no debe impedir usar el sitio.
      }
      aplicarClaseTema(nuevoTema)
    }, { flush: 'post' })
  }

  return {
    tema,
    modoBlancoActivo,
    etiquetaAlternarTema,
    establecerTema,
    alternarTema
  }
}
