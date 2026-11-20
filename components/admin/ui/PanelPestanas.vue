<script setup lang="ts">
/** Pestañas accesibles (flechas, Inicio y Fin). El contenido lo pinta la página según el valor elegido. */
interface Pestana {
  id: string
  etiqueta: string
  conteo?: number | null
  oculta?: boolean
}

const props = defineProps<{ pestanas: Pestana[], etiqueta: string }>()
const modelo = defineModel<string>({ required: true })
const idBase = useId()
const visibles = computed(() => props.pestanas.filter(p => !p.oculta))

function mover(evento: KeyboardEvent, indice: number) {
  const total = visibles.value.length
  let destino = indice
  if (evento.key === 'ArrowRight') destino = (indice + 1) % total
  else if (evento.key === 'ArrowLeft') destino = (indice - 1 + total) % total
  else if (evento.key === 'Home') destino = 0
  else if (evento.key === 'End') destino = total - 1
  else return
  evento.preventDefault()
  modelo.value = visibles.value[destino]!.id
  nextTick(() => document.getElementById(`${idBase}-${visibles.value[destino]!.id}`)?.focus())
}
</script>

<template>
  <div class="pestanas-panel" role="tablist" :aria-label="etiqueta">
    <button
      v-for="(pestana, indice) in visibles"
      :id="`${idBase}-${pestana.id}`"
      :key="pestana.id"
      type="button"
      role="tab"
      :aria-selected="modelo === pestana.id"
      :tabindex="modelo === pestana.id ? 0 : -1"
      :class="{ activa: modelo === pestana.id }"
      @click="modelo = pestana.id"
      @keydown="mover($event, indice)"
    >
      {{ pestana.etiqueta }}
      <span v-if="pestana.conteo != null" class="pestana-conteo">{{ pestana.conteo }}</span>
    </button>
  </div>
</template>
