<script setup lang="ts">
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
      <TarjetaNoticiaSecundaria
        v-for="articulo in articulos"
        :key="articulo.id"
        :articulo="articulo"
      />
    </div>
  </section>
</template>
