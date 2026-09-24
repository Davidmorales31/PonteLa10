<script setup lang="ts">
import { Clock } from '@lucide/vue'
import type { ArticuloLanding } from '~/types/landing'

const props = defineProps<{
  articulo: ArticuloLanding
}>()
const imagenFallida = ref('')
const tieneImagen = computed(() => Boolean(props.articulo.imagen?.trim()) && imagenFallida.value !== props.articulo.imagen)

</script>

<template>
  <article class="tarjeta-articulo-landing" :class="{ 'sin-portada': !tieneImagen }">
    <NuxtLink v-if="tieneImagen" :to="articulo.ruta" class="imagen-tarjeta-articulo-landing">
      <img
        :src="articulo.imagen"
        :alt="articulo.descripcionImagen"
        :style="{ objectPosition: articulo.posicionImagen || 'center' }"
        loading="lazy"
        @error="imagenFallida = articulo.imagen"
      >
    </NuxtLink>
    <div class="contenido-tarjeta-articulo-landing">
      <span :class="['badge-articulo', `badge-${articulo.tonoCategoria || 'azul'}`]">{{ articulo.categoria }}</span>
      <h3><NuxtLink :to="articulo.ruta">{{ articulo.titulo }}</NuxtLink></h3>
      <footer>
        <p class="meta-landing">
          <span>{{ articulo.publicadoHace }}</span>
          <span><Clock aria-hidden="true" /> {{ articulo.tiempoLectura }}</span>
        </p>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.tarjeta-articulo-landing.sin-portada { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; }
</style>
