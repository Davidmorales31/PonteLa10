<script setup lang="ts">
import type { ArticuloResumen } from '~/types/editorial'

defineProps<{ articulo: ArticuloResumen }>()
</script>

<template>
  <article class="tarjeta-articulo-portada">
    <NuxtLink v-if="articulo.imagen" class="imagen-articulo-portada" :to="`/articulos/${encodeURIComponent(articulo.slug)}`" tabindex="-1" aria-hidden="true">
      <ImagenEditorialPublica
        :src="articulo.imagen"
        alt=""
        width="800"
        height="450"
        :ancho-original="articulo.imagenAncho"
        sizes="(max-width: 700px) 86vw, 360px"
        loading="lazy"
        decoding="async"
      />
    </NuxtLink>
    <div class="contenido-articulo-portada">
      <p>{{ articulo.categoria }}</p>
      <h3><NuxtLink :to="`/articulos/${encodeURIComponent(articulo.slug)}`">{{ articulo.titulo }}</NuxtLink></h3>
      <span>{{ articulo.bajada }}</span>
    </div>
  </article>
</template>

<style scoped>
.tarjeta-articulo-portada { min-width: 0; overflow: hidden; border: 1px solid #294467; border-radius: 10px; background: #0c2443; }
.imagen-articulo-portada { display: block; overflow: hidden; aspect-ratio: 16 / 9; background: #102c51; }
.imagen-articulo-portada img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 180ms ease; }
.tarjeta-articulo-portada:hover .imagen-articulo-portada img { transform: scale(1.025); }
.contenido-articulo-portada { display: grid; gap: 8px; padding: 15px; }
.contenido-articulo-portada p { margin: 0; color: #8ddcf4; font-size: .64rem; font-weight: 850; letter-spacing: .07em; text-transform: uppercase; }
.contenido-articulo-portada h3 { margin: 0; color: #fff; font-size: .97rem; line-height: 1.3; text-wrap: balance; }
.contenido-articulo-portada h3 a { color: inherit; text-decoration: none; }
.contenido-articulo-portada h3 a:hover { color: #ffd800; }
.contenido-articulo-portada > span { color: #b8c9dd; font-size: .76rem; line-height: 1.45; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.tarjeta-articulo-portada a:focus-visible { outline: 3px solid #ffd800; outline-offset: -3px; }
@media (prefers-reduced-motion: reduce) { .imagen-articulo-portada img { transition: none; } }
</style>
