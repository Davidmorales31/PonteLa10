<script setup lang="ts">
import type { EstadisticaHeroLanding } from '~/types/landing'
import { obtenerIconoLanding } from '~/utils/iconosLanding'

defineProps<{
  estadisticas: EstadisticaHeroLanding[]
}>()
</script>

<template>
  <dl class="estadisticas-hero">
    <div v-for="estadistica in estadisticas" :key="estadistica.etiqueta">
      <component :is="obtenerIconoLanding(estadistica.icono)" aria-hidden="true" />
      <span>
        <dt>{{ estadistica.valor }}</dt>
        <dd>{{ estadistica.etiqueta }}</dd>
      </span>
    </div>
  </dl>
</template>
