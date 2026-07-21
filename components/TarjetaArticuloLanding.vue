<script setup lang="ts">
import { Bookmark, Clock } from '@lucide/vue'
import type { ArticuloLanding } from '~/types/landing'

defineProps<{
  articulo: ArticuloLanding
}>()

const guardado = ref(false)
</script>

<template>
  <article class="tarjeta-articulo-landing">
    <NuxtLink :to="articulo.ruta" class="imagen-tarjeta-articulo-landing">
      <img
        :src="articulo.imagen"
        :alt="articulo.descripcionImagen"
        :style="{ objectPosition: articulo.posicionImagen || 'center' }"
        loading="lazy"
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
        <button
          type="button"
          :class="{ guardado }"
          :aria-pressed="guardado"
          :aria-label="guardado ? 'Quitar de guardados' : 'Guardar artículo'"
          :title="guardado ? 'Quitar de guardados' : 'Guardar artículo'"
          @click="guardado = !guardado"
        >
          <Bookmark aria-hidden="true" />
        </button>
      </footer>
    </div>
  </article>
</template>
