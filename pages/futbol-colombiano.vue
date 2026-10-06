<script setup lang="ts">
const configuracion = {
  titulo: 'Fútbol colombiano',
  descripcion: 'Noticias, resultados y contexto de las competiciones del fútbol colombiano, con cobertura editorial y datos verificados.',
  etiquetaSeccion: 'FÚTBOL COLOMBIANO',
  categoria: 'futbol-colombiano',
  rutaCanonica: '/futbol-colombiano',
  enlaces: [
    { etiqueta: 'Liga Colombiana', ruta: '/liga-colombiana' },
    { etiqueta: 'Selección Colombia', ruta: '/seleccion-colombia' },
    { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' }
  ]
}
</script>

<template>
  <PublicoHubEditorialPublico :configuracion="configuracion" />
</template>
