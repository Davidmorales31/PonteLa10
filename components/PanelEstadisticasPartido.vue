<script setup lang="ts">
import type { EquipoResultado, EstadisticaPartido } from '~/types/resultados'

defineProps<{
  estadisticas: EstadisticaPartido[]
  equipoLocal: EquipoResultado
  equipoVisitante: EquipoResultado
}>()

function calcularProporcion(valor: number, contraparte: number): number {
  const total = valor + contraparte
  return total ? Math.max(4, Math.round((valor / total) * 100)) : 50
}
</script>

<template>
  <section class="panel-resultados panel-estadisticas" aria-labelledby="titulo-estadisticas-partido">
    <header>
      <EscudoEquipo :equipo="equipoLocal" tamano="pequeno" />
      <h2 id="titulo-estadisticas-partido">Estadísticas del partido</h2>
      <EscudoEquipo :equipo="equipoVisitante" tamano="pequeno" />
    </header>
    <div v-for="estadistica in estadisticas" :key="estadistica.clave" class="fila-estadistica">
      <strong>{{ estadistica.local }}{{ estadistica.sufijo }}</strong>
      <div class="comparador-estadistica">
        <span>{{ estadistica.etiqueta }}</span>
        <div>
          <i class="barra-local" :style="{ width: `${calcularProporcion(estadistica.local, estadistica.visitante)}%` }" />
          <i class="barra-visitante" :style="{ width: `${calcularProporcion(estadistica.visitante, estadistica.local)}%` }" />
        </div>
      </div>
      <strong>{{ estadistica.visitante }}{{ estadistica.sufijo }}</strong>
    </div>
  </section>
</template>
