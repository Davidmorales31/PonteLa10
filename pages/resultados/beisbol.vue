<script setup lang="ts">
import { robotsNoIndex } from '~/utils/seo'

useSeoPont3la10({
  robots: robotsNoIndex,
  titulo: 'Resultados de béisbol y partidos de hoy | Pont3la10',
  descripcion: 'Consulta partidos de béisbol, resultados recientes y próximos encuentros disponibles.',
  rutaCanonica: '/resultados/beisbol'
})
</script>

<template>
  <CentroResultadosDeportivos deporte="beisbol" />
</template>
