<script setup lang="ts">
import { robotsNoIndex } from '~/utils/seo'

useSeoPont3la10({
  robots: robotsNoIndex,
  titulo: 'Resultados de baloncesto y marcadores en vivo | Pont3la10',
  descripcion: 'Consulta partidos de baloncesto, marcadores por cuartos, resultados recientes y próximos encuentros.',
  rutaCanonica: '/resultados/baloncesto',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Resultados de baloncesto',
    inLanguage: 'es-CO'
  }
})
</script>

<template>
  <CentroResultadosDeportivos deporte="baloncesto" />
</template>
