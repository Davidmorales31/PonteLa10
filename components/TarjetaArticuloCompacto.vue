<script setup lang="ts">
import { Clock } from '@lucide/vue'
import type { ArticuloTechLanding } from '~/types/landing'

defineProps<{
  articulo: ArticuloTechLanding
}>()
</script>

<template>
  <article class="tarjeta-tech-landing">
    <NuxtLink
      :to="articulo.ruta"
      :class="['imagen-tech-landing', `sprite-tech-${articulo.posicionSprite}`]"
      :aria-label="articulo.titulo"
    />
    <div>
      <span>Innovación</span>
      <h3><NuxtLink :to="articulo.ruta">{{ articulo.titulo }}</NuxtLink></h3>
      <p class="meta-landing">
        <span>{{ articulo.publicadoHace }}</span>
        <span><Clock aria-hidden="true" /> {{ articulo.tiempoLectura }}</span>
      </p>
    </div>
  </article>
</template>
