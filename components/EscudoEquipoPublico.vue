<script setup lang="ts">
import { obtenerSrcsetEscudoPublico } from '~/utils/imagenesPublicas'

const propiedades = withDefaults(defineProps<{
  src: string
  alt: string
  width: number
  height: number
  sizes: string
  loading?: 'eager' | 'lazy'
  prioridadAlta?: boolean
}>(), {
  loading: 'lazy',
  prioridadAlta: false
})

defineEmits<{ error: [evento: Event] }>()
const srcset = computed(() => obtenerSrcsetEscudoPublico(propiedades.src))
</script>

<template>
  <picture class="escudo-equipo-publico">
    <source v-if="srcset" :srcset="srcset" type="image/webp" :sizes="sizes">
    <img
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :sizes="sizes"
      :loading="loading"
      :fetchpriority="prioridadAlta ? 'high' : 'auto'"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="$emit('error', $event)"
    >
  </picture>
</template>

<style scoped>
.escudo-equipo-publico { display: contents; }
</style>
