<script setup lang="ts">
import type { EquipoResultado } from '~/types/resultados'

const propiedades = withDefaults(defineProps<{
  equipo: EquipoResultado
  tamano?: 'pequeno' | 'mediano' | 'grande'
}>(), {
  tamano: 'mediano'
})

const imagenDisponible = ref(Boolean(propiedades.equipo.logo))
const tamanoVisible = computed(() => ({ pequeno: 22, mediano: 40, grande: 82 })[propiedades.tamano || 'mediano'])

watch(() => propiedades.equipo.logo, logo => {
  imagenDisponible.value = Boolean(logo)
})
</script>

<template>
  <span class="escudo-equipo" :class="`escudo-equipo--${tamano}`" aria-hidden="true">
    <EscudoEquipoPublico
      v-if="imagenDisponible && equipo.logo"
      :src="equipo.logo"
      :alt="`Escudo de ${equipo.nombre}`"
      :sizes="`${tamanoVisible}px`"
      :width="tamanoVisible"
      :height="tamanoVisible"
      loading="lazy"
      @error="imagenDisponible = false"
    />
    <span v-else>{{ equipo.nombreCorto }}</span>
  </span>
</template>
