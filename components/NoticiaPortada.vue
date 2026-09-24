<script setup lang="ts">
import type { ArticuloResumen } from '~/types/editorial'

const props = defineProps<{ articulo: ArticuloResumen; principal?: boolean }>()
const imagenFallida = ref('')
const tieneImagen = computed(() => Boolean(props.articulo.imagen?.trim()) && imagenFallida.value !== props.articulo.imagen)
</script>

<template>
  <article class="noticia-portada" :class="{ principal, 'con-imagen': tieneImagen }">
    <NuxtLink v-if="tieneImagen" class="foto" :to="`/articulos/${articulo.slug}`" tabindex="-1" aria-hidden="true">
      <img :src="articulo.imagen" alt="" :loading="principal ? 'eager' : 'lazy'" :fetchpriority="principal ? 'high' : 'auto'" @error="imagenFallida = articulo.imagen">
    </NuxtLink>
    <div class="texto">
      <p class="categoria">{{ articulo.categoria }}</p>
      <component :is="principal ? 'h1' : 'h2'"><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink></component>
      <p class="resumen">{{ articulo.bajada }}</p>
      <NuxtLink v-if="principal" class="leer" :to="`/articulos/${articulo.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink>
    </div>
  </article>
</template>

<style scoped>
.noticia-portada { min-width: 0; display: grid; align-content: center; border: 1px solid #294467; border-radius: 10px; overflow: hidden; background: #102c51; }
.texto { min-width: 0; padding: 20px; }
.categoria { width: fit-content; margin: 0 0 10px; color: #ffd800; font-size: .65rem; font-weight: 750; text-transform: uppercase; letter-spacing: .065em; line-height: 1.5; }
h1, h2 { margin: 0; color: #fff; text-wrap: balance; letter-spacing: -.025em; }
h2 { font-size: 1rem; line-height: 1.25; font-weight: 750; }
h1 { font-size: clamp(1.8rem, 2.8vw, 2.8rem); line-height: 1.1; font-weight: 850; }
h1 a, h2 a { color: inherit; }
h1 a:hover, h2 a:hover { text-decoration: underline; text-decoration-color: #ffd800; text-underline-offset: 4px; }
.resumen { margin: 10px 0 0; color: #c9d6e8; line-height: 1.5; font-size: .8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.foto { min-width: 0; overflow: hidden; display: block; }
.foto img { display: block; width: 100%; height: 100%; object-fit: cover; }
.con-imagen:not(.principal) { grid-template-columns: 32% minmax(0, 1fr); align-content: stretch; }
.con-imagen:not(.principal) .texto { padding: 16px; }
.con-imagen:not(.principal) .foto { position: relative; min-height: 130px; }
.con-imagen:not(.principal) .foto img { position: absolute; inset: 0; }
.principal { position: relative; min-height: 420px; align-content: end; background: linear-gradient(145deg, #173e6a, #08204a); }
.principal .texto { position: relative; z-index: 1; padding: 32px; }
.principal.con-imagen .foto { position: absolute; inset: 0; }
.principal.con-imagen::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,15,35,.02) 0%, rgba(3,15,35,.48) 30%, rgba(3,15,35,.97) 100%); pointer-events: none; }
.principal:not(.con-imagen) { min-height: 0; align-content: center; align-self: start; border-top: 3px solid #ffd800; }
.principal .resumen { -webkit-line-clamp: 3; font-size: .94rem; color: #e1e8f2; }
.leer { display: inline-flex; align-items: center; gap: 24px; margin-top: 20px; padding: 11px 16px; border-radius: 6px; background: #ffd800; color: #08204a; font-size: .8rem; font-weight: 800; }
.leer:hover { background: #ffe64d; }
a:focus-visible { outline: 3px solid #ffd800; outline-offset: 4px; }
@media(max-width: 700px) {
  .principal .texto { padding: 24px; }
  .principal { min-height: 390px; }
  .principal:not(.con-imagen) { min-height: 0; }
  h1 { font-size: clamp(1.65rem, 6.5vw, 2.3rem); }
  .principal .resumen { font-size: .875rem; }
}
</style>
