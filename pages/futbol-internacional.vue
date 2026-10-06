<script setup lang="ts">
const configuracion = {
  titulo: 'Fútbol internacional',
  descripcion: 'Noticias y contexto de las principales competiciones internacionales, con enlaces a resultados y cobertura relacionada.',
  etiquetaSeccion: 'FÚTBOL INTERNACIONAL',
  categoria: 'futbol-mundial',
  rutaCanonica: '/futbol-internacional',
  enlaces: [
    { etiqueta: 'Colombianos en Europa', ruta: '/colombianos-en-europa' },
    { etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano' },
    { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' }
  ]
}
</script>

<template>
  <PublicoHubEditorialPublico :configuracion="configuracion" />
</template>
