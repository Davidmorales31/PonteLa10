<script setup lang="ts">
import PaginaJornadaCompeticion from '~/components/publico/PaginaJornadaCompeticion.vue'

const ruta = useRoute()
</script>

<template>
  <PaginaJornadaCompeticion
    :slug="String(ruta.params.slug || '')"
    :temporada="String(ruta.params.temporada || '')"
    :jornada="String(ruta.params.jornada || '')"
  />
</template>
