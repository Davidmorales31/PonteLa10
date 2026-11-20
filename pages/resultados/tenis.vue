<script setup lang="ts">
import { robotsNoIndex } from '~/utils/seo'

useSeoPont3la10({
  robots: robotsNoIndex,
  titulo: 'Resultados de tenis y partidos de hoy | Ponte la 10',
  descripcion: 'Consulta partidos de tenis, resultados recientes y próximos encuentros disponibles.',
  rutaCanonica: '/resultados/tenis'
})
</script>

<template>
  <CentroResultadosDeportivos deporte="tenis" />
</template>
