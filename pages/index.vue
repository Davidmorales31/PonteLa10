<script setup lang="ts">
// La misma ruta sirve a los dos sitios: según el dominio se muestra la portada de cada uno.
const { esMexico } = useSitio()
</script>

<template>
  <PublicoPortadaMexico v-if="esMexico" />
  <PublicoPortadaColombia v-else />
</template>
