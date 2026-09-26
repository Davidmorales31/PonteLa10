export type TemaPublico = 'azul' | 'blanco'

const CLAVE_TEMA_PUBLICO = 'pont3la10:tema-publico'

export function useTemaPublico() {
  const tema = useState<TemaPublico>('tema-publico', () => 'azul')
  const inicializado = useState('tema-publico-inicializado', () => false)

  function aplicarClaseTema(nuevoTema: TemaPublico) {
    document.body.classList.remove('tema-publico-azul', 'tema-publico-blanco')
    document.body.classList.add(`tema-publico-${nuevoTema}`)
  }

  if (import.meta.client && !inicializado.value) {
    const temaGuardado = window.localStorage.getItem(CLAVE_TEMA_PUBLICO)
    if (temaGuardado === 'azul' || temaGuardado === 'blanco') {
      tema.value = temaGuardado
    }
    inicializado.value = true
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
      aplicarClaseTema(tema.value)
    })

    watch(tema, (nuevoTema) => {
      window.localStorage.setItem(CLAVE_TEMA_PUBLICO, nuevoTema)
      aplicarClaseTema(nuevoTema)
    }, { immediate: true, flush: 'post' })
  }

  return {
    tema,
    modoBlancoActivo,
    etiquetaAlternarTema,
    establecerTema,
    alternarTema
  }
}
