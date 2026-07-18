<script setup lang="ts">
import type { ModuloInteractivo } from '~/types/editorial'

defineProps<{
  modulo: ModuloInteractivo
}>()
</script>

<template>
  <article class="tarjeta-modulo">
    <span class="estado-modulo">{{ modulo.estado }}</span>
    <h3>{{ modulo.nombre }}</h3>
    <p>{{ modulo.resumen }}</p>
  </article>
</template>
