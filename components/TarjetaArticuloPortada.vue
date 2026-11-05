<script setup lang="ts">
import type { ArticuloResumen } from '~/types/editorial'
defineProps<{ articulo: ArticuloResumen }>()
</script>

<template>
  <TarjetaNoticiaSecundaria :articulo="articulo" mostrar-resumen />
</template>
