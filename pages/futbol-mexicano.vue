<script setup lang="ts">
const configuracion = {
  titulo: 'Fútbol mexicano',
  descripcion: 'Noticias, resultados y contexto de la Liga MX, la Selección Mexicana y el fútbol de México, con cobertura editorial y datos verificados.',
  etiquetaSeccion: 'FÚTBOL MEXICANO',
  categoria: 'futbol-mexicano',
  rutaCanonica: '/futbol-mexicano',
  enlaces: [
    { etiqueta: 'Liga MX', ruta: '/liga-mx' },
    { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' }
  ]
}
</script>

<template>
  <PublicoHubEditorialPublico :configuracion="configuracion" />
</template>
