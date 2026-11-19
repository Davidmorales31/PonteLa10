<script setup lang="ts">
// La misma ruta sirve a los dos sitios: México muestra la agenda de la Liga MX y Colombia la agenda general.
const { esMexico } = useSitio()
</script>

<template>
  <PublicoPartidosHoyMexico v-if="esMexico" />
  <PublicoPartidosHoyGeneral v-else />
</template>
