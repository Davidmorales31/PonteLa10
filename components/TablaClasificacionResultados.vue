<script setup lang="ts">
import type { PosicionClasificacion } from '~/types/resultados'

defineProps<{ posiciones: PosicionClasificacion[] }>()
</script>

<template>
  <div class="tabla-clasificacion-contenedor">
    <table class="tabla-clasificacion-resultados">
      <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead>
      <tbody>
        <tr v-for="posicion in posiciones" :key="posicion.equipo.id" :class="{ destacado: posicion.destacado }">
          <td>{{ posicion.posicion }}</td>
          <td><EscudoEquipo :equipo="posicion.equipo" tamano="pequeno" /><strong>{{ posicion.equipo.nombre }}</strong></td>
          <td>{{ posicion.jugados }}</td>
          <td>{{ posicion.diferencia > 0 ? '+' : '' }}{{ posicion.diferencia }}</td>
          <td><strong>{{ posicion.puntos }}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
