<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

/** Botón que abre un panel flotante (filtros, menús). Cierra con Esc, clic fuera o al perder el foco. */
withDefaults(defineProps<{
  etiqueta: string
  insignia?: number
  alinear?: 'inicio' | 'fin'
  sinFlecha?: boolean
}>(), { insignia: 0, alinear: 'inicio', sinFlecha: false })

const abierto = ref(false)
const raiz = ref<HTMLElement | null>(null)
const idPanel = useId()

function alternar() {
  abierto.value = !abierto.value
}

function cerrar() {
  abierto.value = false
}

function fueraDelPopover(evento: MouseEvent) {
  if (abierto.value && raiz.value && !raiz.value.contains(evento.target as Node)) cerrar()
}

onMounted(() => document.addEventListener('mousedown', fueraDelPopover))
onBeforeUnmount(() => document.removeEventListener('mousedown', fueraDelPopover))

defineExpose({ cerrar })
</script>

<template>
  <div ref="raiz" class="popover-panel" @keydown.esc.stop="cerrar">
    <button
      class="popover-panel-boton"
      type="button"
      aria-haspopup="true"
      :aria-expanded="abierto"
      :aria-controls="idPanel"
      @click="alternar"
    >
      <slot name="icono" />
      <span>{{ etiqueta }}</span>
      <span v-if="insignia" class="popover-panel-insignia">{{ insignia }}</span>
      <ChevronDown v-if="!sinFlecha" class="popover-panel-flecha" aria-hidden="true" />
    </button>
    <div
      v-if="abierto"
      :id="idPanel"
      class="popover-panel-contenido"
      :class="{ 'popover-panel-contenido--fin': alinear === 'fin' }"
    >
      <slot :cerrar="cerrar" />
    </div>
  </div>
</template>
