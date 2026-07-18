<script setup lang="ts">
import type { ArticuloResumen } from '~/types/editorial'
import { obtenerRutaArticulo } from '~/utils/rutasEditoriales'

defineProps<{
  articulo: ArticuloResumen
  variante?: 'compacta' | 'normal'
}>()
</script>

<template>
  <article :class="['tarjeta-articulo', variante === 'compacta' && 'tarjeta-articulo-compacta']">
    <NuxtLink class="tarjeta-articulo-imagen" :to="obtenerRutaArticulo(articulo.slug)">
      <img :src="articulo.imagen" :alt="articulo.titulo" loading="lazy">
    </NuxtLink>
    <div class="tarjeta-articulo-cuerpo">
      <p class="etiqueta-seccion">{{ articulo.categoria }}</p>
      <h3>
        <NuxtLink :to="obtenerRutaArticulo(articulo.slug)">{{ articulo.titulo }}</NuxtLink>
      </h3>
      <p v-if="variante !== 'compacta'" class="texto-apoyo">{{ articulo.bajada }}</p>
      <p class="meta-articulo">{{ articulo.autor }} · {{ articulo.publicadoHace }} · {{ articulo.lecturaMinutos }} min</p>
    </div>
  </article>
</template>
