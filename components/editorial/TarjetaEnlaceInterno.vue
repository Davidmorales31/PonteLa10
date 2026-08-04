<script setup lang="ts">
import { ArrowRight, Image as ImageIcon } from '@lucide/vue'
import type { EnlaceArticuloInternoEditorial } from '~/types/contenidoEditorial'

withDefaults(defineProps<{
  articulo: EnlaceArticuloInternoEditorial
  navegable?: boolean
}>(), {
  navegable: true
})
</script>

<template>
  <component
    :is="navegable ? resolveComponent('NuxtLink') : 'div'"
    class="tarjeta-enlace-interno"
    :to="navegable ? `/articulos/${articulo.slug}` : undefined"
  >
    <span class="imagen-enlace-interno">
      <img
        v-if="articulo.imagen"
        :src="articulo.imagen"
        :alt="articulo.titulo"
        width="320"
        height="180"
        loading="lazy"
      >
      <ImageIcon v-else aria-hidden="true" />
    </span>
    <span class="contenido-enlace-interno">
      <small>También puede interesarte · {{ articulo.categoria }}</small>
      <strong>{{ articulo.titulo }}</strong>
      <span>{{ articulo.resumen }}</span>
    </span>
    <ArrowRight aria-hidden="true" />
  </component>
</template>
