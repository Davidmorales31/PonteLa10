<script setup lang="ts">
import { X } from '@lucide/vue'

/**
 * Ventana modal o panel lateral del panel editorial. Cierra con Esc, clic fuera o la X; atrapa el foco,
 * bloquea el scroll de la página y devuelve el foco a quien la abrió.
 */
const props = withDefaults(defineProps<{
  abierto: boolean
  titulo: string
  descripcion?: string
  ancho?: 'sm' | 'md' | 'lg' | 'xl'
  lateral?: boolean
  bloqueado?: boolean
}>(), { descripcion: '', ancho: 'md', lateral: false, bloqueado: false })

const emit = defineEmits<{ cerrar: [] }>()

const idTitulo = useId()
const idDescripcion = useId()
const caja = ref<HTMLElement | null>(null)
let origenFoco: HTMLElement | null = null

const enfocables = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function cerrar() {
  if (!props.bloqueado) emit('cerrar')
}

function alPulsar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    evento.stopPropagation()
    cerrar()
    return
  }
  if (evento.key !== 'Tab' || !caja.value) return
  const lista = [...caja.value.querySelectorAll<HTMLElement>(enfocables)].filter(el => el.offsetParent !== null)
  if (!lista.length) return
  const primero = lista[0]!
  const ultimo = lista[lista.length - 1]!
  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primero.focus()
  }
}

watch(() => props.abierto, async (abierto) => {
  if (!import.meta.client) return
  if (abierto) {
    origenFoco = document.activeElement as HTMLElement | null
    document.documentElement.classList.add('modal-panel-abierto')
    await nextTick()
    const objetivo = caja.value?.querySelector<HTMLElement>('[data-foco-inicial]')
      || caja.value?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')
      || caja.value?.querySelector<HTMLElement>('.modal-panel-cerrar')
    objetivo?.focus()
  } else {
    document.documentElement.classList.remove('modal-panel-abierto')
    origenFoco?.focus?.()
    origenFoco = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (import.meta.client) document.documentElement.classList.remove('modal-panel-abierto')
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="modal-panel-fondo"
      :class="{ 'modal-panel-fondo--lateral': lateral }"
      @mousedown.self="cerrar"
      @keydown="alPulsar"
    >
      <div
        ref="caja"
        class="modal-panel"
        :class="[`modal-panel--${ancho}`, { 'modal-panel--lateral': lateral }]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
        :aria-describedby="descripcion ? idDescripcion : undefined"
      >
        <header class="modal-panel-cabecera">
          <div>
            <h2 :id="idTitulo">{{ titulo }}</h2>
            <p v-if="descripcion" :id="idDescripcion">{{ descripcion }}</p>
          </div>
          <button
            class="modal-panel-cerrar"
            type="button"
            :disabled="bloqueado"
            aria-label="Cerrar"
            @click="cerrar"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div class="modal-panel-cuerpo">
          <slot />
        </div>
        <footer v-if="$slots.pie" class="modal-panel-pie">
          <slot name="pie" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
