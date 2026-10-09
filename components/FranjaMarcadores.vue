<script setup lang="ts">
import { ArrowRight, Radio } from '@lucide/vue'
import type { PartidoResultado } from '~/types/resultados'

const propiedades = withDefaults(defineProps<{ partidos: PartidoResultado[]; destino?: string }>(), {
  destino: '/resultados'
})
const partidosVisibles = computed(() => propiedades.partidos.slice(0, 8))
const cantidadEnVivo = computed(() => propiedades.partidos.filter(partido => partido.estado === 'en-vivo').length)
const cantidadProximos = computed(() => propiedades.partidos.filter(partido => partido.estado === 'programado').length)
const etiquetaFranja = computed(() => cantidadEnVivo.value
  ? `${cantidadEnVivo.value} en vivo`
  : cantidadProximos.value ? 'Próximos de hoy' : 'Resultados recientes')
</script>

<template>
  <section class="franja-marcadores-home" aria-labelledby="titulo-marcadores-home">
    <div class="franja-marcadores-contenido">
      <div class="encabezado-franja-marcadores">
        <div>
          <span v-if="cantidadEnVivo" class="senal-en-vivo"><Radio aria-hidden="true" /> {{ etiquetaFranja }}</span>
          <span v-else class="senal-resultados">{{ etiquetaFranja }}</span>
          <h2 id="titulo-marcadores-home">Marcadores</h2>
        </div>
        <NuxtLink :to="destino">
          Ver todos
          <span class="icono-enlace-marcadores"><ArrowRight aria-hidden="true" /></span>
        </NuxtLink>
      </div>
      <div class="carril-marcadores" tabindex="0" aria-label="Partidos destacados">
        <TarjetaMarcadorCompacto v-for="partido in partidosVisibles" :key="partido.id" :partido="partido" />
      </div>
    </div>
  </section>
</template>

<style src="~/assets/css/resultados.css"></style>
