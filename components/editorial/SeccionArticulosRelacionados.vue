<script setup lang="ts">
import { ArrowRight, Image as ImageIcon } from '@lucide/vue'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

defineProps<{
  articulos: ResumenArticuloPublico[]
}>()
</script>

<template>
  <section
    v-if="articulos.length"
    class="seccion-articulos-relacionados"
    aria-labelledby="titulo-articulos-relacionados"
  >
    <header>
      <p class="etiqueta-seccion">Sigue leyendo</p>
      <h2 id="titulo-articulos-relacionados">Más historias para ti</h2>
    </header>
    <div class="rejilla-articulos-relacionados">
      <NuxtLink
        v-for="articulo in articulos"
        :key="articulo.id"
        :to="`/articulos/${articulo.slug}`"
      >
        <span class="imagen-articulo-recomendado">
          <img
            v-if="articulo.imagen"
            :src="articulo.imagen"
            :alt="articulo.titulo"
            width="480"
            height="270"
            loading="lazy"
          >
          <ImageIcon v-else aria-hidden="true" />
        </span>
        <small>{{ articulo.categoria }}</small>
        <strong>{{ articulo.titulo }}</strong>
        <span class="leer-articulo-recomendado">
          Leer noticia <ArrowRight aria-hidden="true" />
        </span>
      </NuxtLink>
    </div>
  </section>
</template>
