<script setup lang="ts">
import { robotsNoIndex } from '~/utils/seo'
const { sitio: sitioActivo } = useSitio()

useSeoPont3la10({
  robots: robotsNoIndex,
  titulo: 'Resultados de baloncesto y marcadores en vivo | Ponte la 10',
  descripcion: 'Consulta partidos de baloncesto, marcadores por cuartos, resultados recientes y próximos encuentros.',
  rutaCanonica: '/resultados/baloncesto',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Resultados de baloncesto',
    inLanguage: sitioActivo.value.idioma
  }
})
</script>

<template>
  <CentroResultadosDeportivos deporte="baloncesto" />
</template>
