<script setup lang="ts">
import { ChevronRight, Radio } from '@lucide/vue'
import type { PartidoResultado } from '~/types/resultados'

const propiedades = defineProps<{ partidos: PartidoResultado[] }>()
const partidosVisibles = computed(() => propiedades.partidos.slice(0, 8))
const cantidadEnVivo = computed(() => propiedades.partidos.filter(partido => partido.estado === 'en-vivo').length)
</script>

<template>
  <section class="franja-marcadores-home" aria-labelledby="titulo-marcadores-home">
    <div class="franja-marcadores-contenido">
      <div class="encabezado-franja-marcadores">
        <div>
          <span v-if="cantidadEnVivo" class="senal-en-vivo"><Radio aria-hidden="true" /> {{ cantidadEnVivo }} en vivo</span>
          <span v-else class="senal-resultados">Últimos resultados</span>
          <h2 id="titulo-marcadores-home">Marcadores</h2>
        </div>
        <NuxtLink to="/resultados">Todos <ChevronRight aria-hidden="true" /></NuxtLink>
      </div>
      <div class="carril-marcadores" tabindex="0" aria-label="Partidos destacados">
        <TarjetaMarcadorCompacto v-for="partido in partidosVisibles" :key="partido.id" :partido="partido" />
      </div>
    </div>
  </section>
</template>
