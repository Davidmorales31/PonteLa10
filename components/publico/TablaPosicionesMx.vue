<script setup lang="ts">
import type { PosicionLigaMx } from '~/types/ligaMx'

const props = withDefaults(defineProps<{
  filas: PosicionLigaMx[]
  titulo: string
  limite?: number
  compacta?: boolean
  oscuro?: boolean
}>(), { limite: 0, compacta: false, oscuro: false })

const visibles = computed(() => props.limite > 0 ? props.filas.slice(0, props.limite) : props.filas)
</script>

<template>
  <div class="tabla-mx-envoltura">
    <table class="tabla-mx" :class="{ compacta, oscuro }">
      <caption>{{ titulo }}</caption>
      <thead>
        <tr>
          <th scope="col" class="num">#</th>
          <th scope="col">Equipo</th>
          <th scope="col" class="num" title="Partidos jugados">PJ</th>
          <th v-if="!compacta" scope="col" class="num" title="Ganados">G</th>
          <th v-if="!compacta" scope="col" class="num" title="Empatados">E</th>
          <th v-if="!compacta" scope="col" class="num" title="Perdidos">P</th>
          <th scope="col" class="num" title="Diferencia de goles">DG</th>
          <th scope="col" class="num" title="Puntos">Pts</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="fila in visibles" :key="`${fila.fase}-${fila.equipoClave}`">
          <td class="num">{{ fila.posicion }}</td>
          <th scope="row">
            <NuxtLink class="equipo-mx" :to="`/clubes/${fila.equipoClave}`"><b aria-hidden="true">{{ fila.equipo.slice(0, 1) }}</b>{{ fila.equipo }}</NuxtLink>
          </th>
          <td class="num">{{ fila.jugados }}</td>
          <td v-if="!compacta" class="num">{{ fila.ganados }}</td>
          <td v-if="!compacta" class="num">{{ fila.empatados }}</td>
          <td v-if="!compacta" class="num">{{ fila.perdidos }}</td>
          <td class="num">{{ fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia }}</td>
          <td class="num puntos">{{ fila.puntos }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tabla-mx-envoltura { overflow-x: auto; }
.tabla-mx { width: 100%; border-collapse: collapse; font-size: .88rem; color: #08204a; }
.tabla-mx caption { padding: 0 0 8px; text-align: left; color: #5f6878; font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.tabla-mx th, .tabla-mx td { padding: 9px 6px; border-bottom: 1px solid #dbe2ee; text-align: left; font-weight: 600; }
.tabla-mx thead th { color: #5f6878; font-size: .7rem; font-weight: 800; }
.tabla-mx .num { width: 2.4rem; text-align: right; font-variant-numeric: tabular-nums; }
.tabla-mx .puntos { color: #145996; font-weight: 850; }
.tabla-mx tbody th { font-weight: 700; }
.tabla-mx tbody tr:hover { background: #f4f7fb; }
.equipo-mx { display: inline-flex; align-items: center; gap: 8px; color: inherit; text-decoration: none; }
.equipo-mx:hover { text-decoration: underline; }
.equipo-mx b { display: inline-grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: #174ea6; color: #fff; font-size: .72rem; }
.tabla-mx.compacta { font-size: .82rem; }
.tabla-mx.oscuro { color: #f5f8ff; }
.tabla-mx.oscuro caption, .tabla-mx.oscuro thead th { color: #9eafc8; }
.tabla-mx.oscuro th, .tabla-mx.oscuro td { border-bottom-color: rgba(255, 255, 255, .1); }
.tabla-mx.oscuro .puntos { color: #ffd800; }
.tabla-mx.oscuro tbody tr:hover { background: rgba(255, 255, 255, .05); }
</style>
