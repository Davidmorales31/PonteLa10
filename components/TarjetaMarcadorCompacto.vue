<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import type { PartidoResultado } from '~/types/resultados'

defineProps<{ partido: PartidoResultado }>()
</script>

<template>
  <NuxtLink
    class="tarjeta-marcador-compacto"
    :class="{ 'partido-en-vivo': partido.estado === 'en-vivo' }"
    :to="`/resultados/${partido.id}`"
    :aria-label="`Ver ${partido.equipoLocal.nombre} contra ${partido.equipoVisitante.nombre}`"
  >
    <header>
      <span>{{ partido.competencia }}</span>
      <EtiquetaEstadoPartido :partido="partido" />
    </header>
    <div class="fila-equipo-marcador">
      <EscudoEquipo :equipo="partido.equipoLocal" tamano="pequeno" />
      <strong>{{ partido.equipoLocal.nombre }}</strong>
      <b>{{ partido.marcadorLocal ?? '-' }}</b>
    </div>
    <div class="fila-equipo-marcador">
      <EscudoEquipo :equipo="partido.equipoVisitante" tamano="pequeno" />
      <strong>{{ partido.equipoVisitante.nombre }}</strong>
      <b>{{ partido.marcadorVisitante ?? '-' }}</b>
    </div>
    <ChevronRight class="flecha-marcador" aria-hidden="true" />
  </NuxtLink>
</template>
