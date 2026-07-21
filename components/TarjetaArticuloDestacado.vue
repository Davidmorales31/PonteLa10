<script setup lang="ts">
import { ArrowRight, Clock } from '@lucide/vue'
import type { ArticuloLanding } from '~/types/landing'

defineProps<{
  articulo: ArticuloLanding
}>()
</script>

<template>
  <article class="articulo-destacado-landing">
    <NuxtLink :to="articulo.ruta" class="imagen-articulo-destacado">
      <img
        :src="articulo.imagen"
        :alt="articulo.descripcionImagen"
        :style="{ objectPosition: articulo.posicionImagen || 'center' }"
      >
    </NuxtLink>
    <div class="contenido-articulo-destacado">
      <span :class="['badge-articulo', `badge-${articulo.tonoCategoria || 'azul'}`]">{{ articulo.categoria }}</span>
      <h3><NuxtLink :to="articulo.ruta">{{ articulo.titulo }}</NuxtLink></h3>
      <p>{{ articulo.resumen }}</p>
      <div class="pie-articulo-destacado">
        <p class="meta-landing">
          <span>{{ articulo.publicadoHace }}</span>
          <span><Clock aria-hidden="true" /> {{ articulo.tiempoLectura }}</span>
        </p>
        <NuxtLink :to="articulo.ruta" class="enlace-seccion-landing">
          Leer análisis
          <ArrowRight aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
