<script setup lang="ts">
const configuracion = {
  titulo: 'Selección Mexicana',
  descripcion: 'Noticias, convocatorias y partidos de la Selección Mexicana, con cobertura editorial y fuentes identificables.',
  etiquetaSeccion: 'SELECCIÓN MEXICANA',
  categoria: '',
  tema: 'seleccion-mexicana',
  rutaCanonica: '/seleccion-mexicana',
  enlaces: [
    { etiqueta: 'Liga MX', ruta: '/liga-mx' },
    { etiqueta: 'Mexicanos en el exterior', ruta: '/mexicanos-en-el-exterior' },
    { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' }
  ]
}
</script>

<template>
  <PublicoHubEditorialPublico :configuracion="configuracion">
    <template #intro>
      <p class="fuente-oficial-mx">
        Convocatorias, calendario y comunicados oficiales en
        <a href="https://www.fmf.mx" target="_blank" rel="noopener noreferrer">fmf.mx</a>.
        Cada convocatoria y cada fecha que publicamos se contrasta con esa fuente.
      </p>
    </template>
  </PublicoHubEditorialPublico>
</template>

<style scoped>
.fuente-oficial-mx { margin: 18px 0 0; color: #5f6878; line-height: 1.55; }
</style>
