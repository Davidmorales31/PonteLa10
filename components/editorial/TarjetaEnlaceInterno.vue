<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { EnlaceArticuloInternoEditorial } from '~/types/contenidoEditorial'

withDefaults(defineProps<{
  articulo: EnlaceArticuloInternoEditorial
  navegable?: boolean
}>(), {
  navegable: true
})
</script>

<template>
  <NuxtLink
    v-if="navegable"
    :class="['tarjeta-enlace-interno', { 'sin-imagen': !articulo.imagen }]"
    :to="`/articulos/${articulo.slug}`"
  >
    <span v-if="articulo.imagen" class="imagen-enlace-interno">
      <img
        :src="articulo.imagen"
        :alt="articulo.titulo"
        width="320"
        height="180"
        loading="lazy"
      >
    </span>
    <span class="contenido-enlace-interno">
      <small>También puede interesarte · {{ articulo.categoria }}</small>
      <strong>{{ articulo.titulo }}</strong>
      <span>{{ articulo.resumen }}</span>
    </span>
    <ArrowRight aria-hidden="true" />
  </NuxtLink>
  <div
    v-else
    :class="['tarjeta-enlace-interno', { 'sin-imagen': !articulo.imagen }]"
  >
    <span v-if="articulo.imagen" class="imagen-enlace-interno">
      <img
        :src="articulo.imagen"
        :alt="articulo.titulo"
        width="320"
        height="180"
        loading="lazy"
      >
    </span>
    <span class="contenido-enlace-interno">
      <small>También puede interesarte · {{ articulo.categoria }}</small>
      <strong>{{ articulo.titulo }}</strong>
      <span>{{ articulo.resumen }}</span>
    </span>
    <ArrowRight aria-hidden="true" />
  </div>
</template>
