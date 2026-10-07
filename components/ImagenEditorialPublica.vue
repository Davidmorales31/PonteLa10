<script setup lang="ts">
import { obtenerSrcsetMedioEditorial } from '~/utils/media/imagenesEditoriales'

const props = withDefaults(defineProps<{
  src: string
  alt: string
  width: number | string
  height: number | string
  anchoOriginal?: number | null
  sizes?: string
  loading?: 'eager' | 'lazy'
  prioridadAlta?: boolean
}>(), {
  anchoOriginal: null,
  sizes: '100vw',
  loading: 'lazy',
  prioridadAlta: false
})

defineEmits<{
  error: [evento: Event]
}>()

const configuracion = useRuntimeConfig()
const srcset = computed(() => obtenerSrcsetMedioEditorial(
  props.src,
  String(configuracion.public.supabaseUrl || ''),
  props.anchoOriginal
))
</script>

<template>
  <img
    :src="src"
    :srcset="srcset"
    :sizes="srcset ? sizes : undefined"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    :fetchpriority="prioridadAlta ? 'high' : 'auto'"
    decoding="async"
    @error="$emit('error', $event)"
  >
</template>
