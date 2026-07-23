<script setup lang="ts">
import { Activity, Clock3, Goal, Radio } from '@lucide/vue'
import type { DetallePartidoResultado } from '~/types/resultados'

const propiedades = defineProps<{ detalle: DetallePartidoResultado }>()

const posesion = computed(() => propiedades.detalle.estadisticas.find(item => item.clave === 'ball-possession'))
const tiros = computed(() => propiedades.detalle.estadisticas.find(item => item.clave === 'total-shots'))
const ultimoEvento = computed(() => propiedades.detalle.eventos.at(-1))
const goles = computed(() => propiedades.detalle.eventos.filter(evento => evento.tipo === 'gol').length)
</script>

<template>
  <section class="panel-resultados panel-resumen-partido" aria-labelledby="titulo-resumen-partido">
    <header>
      <div>
        <p><Radio v-if="detalle.partido.estado === 'en-vivo'" aria-hidden="true" /><Clock3 v-else aria-hidden="true" /> Estado del partido</p>
        <h2 id="titulo-resumen-partido">Así va la jugada</h2>
      </div>
      <EtiquetaEstadoPartido :partido="detalle.partido" />
    </header>

    <div class="indicadores-resumen-partido">
      <article><Goal aria-hidden="true" /><strong>{{ goles }}</strong><span>Goles registrados</span></article>
      <article><Activity aria-hidden="true" /><strong>{{ tiros ? `${tiros.local} - ${tiros.visitante}` : '—' }}</strong><span>Tiros</span></article>
      <article><Radio aria-hidden="true" /><strong>{{ posesion ? `${posesion.local}% - ${posesion.visitante}%` : '—' }}</strong><span>Posesión</span></article>
    </div>

    <div v-if="ultimoEvento" class="ultima-jugada-resumen">
      <IconoEventoPartido :tipo="ultimoEvento.tipo" />
      <div><span>Última jugada · {{ ultimoEvento.minuto }}</span><strong>{{ ultimoEvento.jugador }}</strong><small>{{ ultimoEvento.detalle }}</small></div>
    </div>
    <EstadoDatosResultados v-else titulo="Partido sin eventos registrados" descripcion="El proveedor todavía no reporta jugadas para este encuentro." />
  </section>
</template>
