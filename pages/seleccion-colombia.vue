<script setup lang="ts">
const configuracion = {
  titulo: 'Selección Colombia',
  descripcion: 'Noticias, calendario y actualidad de las selecciones colombianas. Convocatorias y datos deportivos se publican cuando cuentan con respaldo verificable.',
  etiquetaSeccion: 'SELECCIÓN COLOMBIA',
  categoria: 'colombia',
  rutaCanonica: '/seleccion-colombia',
  enlaces: [
    { etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano' },
    { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' },
    { etiqueta: 'Colombianos en Europa', ruta: '/colombianos-en-europa' }
  ]
}
</script>

<template>
  <PublicoHubEditorialPublico :configuracion="configuracion" />
</template>
