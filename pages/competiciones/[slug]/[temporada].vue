<script setup lang="ts">
import PaginaCompeticionPublica from '~/components/publico/PaginaCompeticionPublica.vue'

const ruta = useRoute()
const slug = computed(() => String(ruta.params.slug || ''))
const temporada = computed(() => String(ruta.params.temporada || ''))
</script>

<template>
  <PaginaCompeticionPublica :key="`${slug}-${temporada}`" :slug="slug" :temporada="temporada" />
</template>
