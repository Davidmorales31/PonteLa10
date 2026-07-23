<script setup lang="ts">
import type { EquipoResultado } from '~/types/resultados'

const propiedades = withDefaults(defineProps<{
  equipo: EquipoResultado
  tamano?: 'pequeno' | 'mediano' | 'grande'
}>(), {
  tamano: 'mediano'
})

const imagenDisponible = ref(Boolean(propiedades.equipo.logo))

watch(() => propiedades.equipo.logo, logo => {
  imagenDisponible.value = Boolean(logo)
})
</script>

<template>
  <span class="escudo-equipo" :class="`escudo-equipo--${tamano}`" aria-hidden="true">
    <img
      v-if="imagenDisponible && equipo.logo"
      :src="equipo.logo"
      :alt="`Escudo de ${equipo.nombre}`"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="imagenDisponible = false"
    >
    <span v-else>{{ equipo.nombreCorto }}</span>
  </span>
</template>
