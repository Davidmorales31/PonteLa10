<script setup lang="ts">
const configuracion = {
  titulo: 'Mexicanos en el exterior',
  descripcion: 'Noticias de los futbolistas mexicanos que juegan en Europa, la MLS y otras ligas, con su club y su calendario verificados.',
  etiquetaSeccion: 'MEXICANOS EN EL EXTERIOR',
  categoria: '',
  tema: 'mexicanos-en-el-exterior',
  rutaCanonica: '/mexicanos-en-el-exterior',
  enlaces: [
    { etiqueta: 'Liga MX', ruta: '/liga-mx' },
    { etiqueta: 'Selección Mexicana', ruta: '/seleccion-mexicana' },
    { etiqueta: 'Fútbol internacional', ruta: '/futbol-internacional' },
    { etiqueta: 'Resultados', ruta: '/resultados/futbol' }
  ]
}
</script>

<template>
  <PublicoHubEditorialPublico :configuracion="configuracion">
    <template #intro>
      <p class="nota-exterior-mx">
        El club de cada jugador cambia con los traspasos: solo publicamos un dato cuando lo contrastamos con la fuente
        oficial del club el mismo día.
      </p>
    </template>
  </PublicoHubEditorialPublico>
</template>

<style scoped>
.nota-exterior-mx { margin: 18px 0 0; color: #5f6878; line-height: 1.55; }
</style>
