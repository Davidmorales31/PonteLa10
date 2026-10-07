<script setup lang="ts">
import type { ArticuloResumen } from '~/types/editorial'
import { obtenerRutaArticulo } from '~/utils/rutasEditoriales'

const props = defineProps<{
  articulo: ArticuloResumen
  variante?: 'compacta' | 'normal'
}>()
const imagenFallida = ref('')
const tieneImagen = computed(() => Boolean(props.articulo.imagen?.trim()) && imagenFallida.value !== props.articulo.imagen)
</script>

<template>
  <article :class="['tarjeta-articulo', variante === 'compacta' && 'tarjeta-articulo-compacta', { 'sin-portada': !tieneImagen }]">
    <NuxtLink v-if="tieneImagen" class="tarjeta-articulo-imagen" :to="obtenerRutaArticulo(articulo.slug)">
      <ImagenEditorialPublica
        :src="articulo.imagen"
        :alt="articulo.titulo"
        width="640"
        height="360"
        :ancho-original="articulo.imagenAncho"
        sizes="(max-width: 760px) 100vw, 640px"
        @error="imagenFallida = articulo.imagen"
      />
    </NuxtLink>
    <div class="tarjeta-articulo-cuerpo">
      <p class="etiqueta-seccion">{{ articulo.categoria }}</p>
      <h3>
        <NuxtLink :to="obtenerRutaArticulo(articulo.slug)">{{ articulo.titulo }}</NuxtLink>
      </h3>
      <p v-if="variante !== 'compacta'" class="texto-apoyo">{{ articulo.bajada }}</p>
      <p class="meta-articulo">
        {{ articulo.autor }} · {{ articulo.publicadoHace }}<template v-if="articulo.lecturaMinutos"> · {{ articulo.lecturaMinutos }} min</template>
      </p>
    </div>
  </article>
</template>

<style scoped>
.tarjeta-articulo.sin-portada { grid-template-columns: minmax(0, 1fr); }
</style>
