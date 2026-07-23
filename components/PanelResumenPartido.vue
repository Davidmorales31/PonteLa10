<script setup lang="ts">
import { Activity, Clock3, Goal, Radio } from '@lucide/vue'
import type { DetallePartidoResultado } from '~/types/resultados'

const propiedades = defineProps<{ detalle: DetallePartidoResultado }>()

const posesion = computed(() => propiedades.detalle.estadisticas.find(item => item.clave === 'ball-possession'))
const tiros = computed(() => propiedades.detalle.estadisticas.find(item => item.clave === 'total-shots'))
const rebotes = computed(() => propiedades.detalle.estadisticas.find(item => item.clave === 'rebotes'))
const asistencias = computed(() => propiedades.detalle.estadisticas.find(item => item.clave === 'asistencias'))
const ultimoPeriodo = computed(() => propiedades.detalle.estadisticas
  .filter(item => item.clave.includes('cuarto') || item.clave === 'tiempo-extra')
  .at(-1))
const ultimoEvento = computed(() => propiedades.detalle.eventos.at(-1))
const goles = computed(() => propiedades.detalle.eventos.filter(evento => evento.tipo === 'gol').length)
const esBaloncesto = computed(() => propiedades.detalle.partido.deporte === 'baloncesto')
const puntos = computed(() => (
  (propiedades.detalle.partido.marcadorLocal || 0) + (propiedades.detalle.partido.marcadorVisitante || 0)
))
</script>

<template>
  <section class="panel-resultados panel-resumen-partido" aria-labelledby="titulo-resumen-partido">
    <header>
      <div>
        <p><Radio v-if="detalle.partido.estado === 'en-vivo'" aria-hidden="true" /><Clock3 v-else aria-hidden="true" /> Estado del partido</p>
        <h2 id="titulo-resumen-partido">Así va el partido</h2>
      </div>
      <EtiquetaEstadoPartido :partido="detalle.partido" />
    </header>

    <div class="indicadores-resumen-partido">
      <article>
        <Goal aria-hidden="true" />
        <strong>{{ esBaloncesto ? puntos : goles }}</strong>
        <span>{{ esBaloncesto ? 'Puntos totales' : 'Goles registrados' }}</span>
      </article>
      <article>
        <Activity aria-hidden="true" />
        <strong>{{ esBaloncesto ? (rebotes ? `${rebotes.local} - ${rebotes.visitante}` : '—') : (tiros ? `${tiros.local} - ${tiros.visitante}` : '—') }}</strong>
        <span>{{ esBaloncesto ? 'Rebotes' : 'Tiros' }}</span>
      </article>
      <article>
        <Radio aria-hidden="true" />
        <strong>{{ esBaloncesto ? (asistencias ? `${asistencias.local} - ${asistencias.visitante}` : '—') : (posesion ? `${posesion.local}% - ${posesion.visitante}%` : '—') }}</strong>
        <span>{{ esBaloncesto ? 'Asistencias' : 'Posesión' }}</span>
      </article>
    </div>

    <div v-if="ultimoEvento" class="ultima-jugada-resumen">
      <IconoEventoPartido :tipo="ultimoEvento.tipo" />
      <div><span>Última jugada · {{ ultimoEvento.minuto }}</span><strong>{{ ultimoEvento.jugador }}</strong><small>{{ ultimoEvento.detalle }}</small></div>
    </div>
    <div v-else-if="esBaloncesto && ultimoPeriodo" class="ultima-jugada-resumen">
      <Activity aria-hidden="true" />
      <div>
        <span>Último periodo disponible</span>
        <strong>{{ ultimoPeriodo.etiqueta }}</strong>
        <small>{{ ultimoPeriodo.local }} - {{ ultimoPeriodo.visitante }}</small>
      </div>
    </div>
    <EstadoDatosResultados
      v-else
      :titulo="esBaloncesto ? 'Desglose no disponible' : 'Partido sin eventos registrados'"
      :descripcion="esBaloncesto
        ? 'El proveedor todavía no reporta estadísticas detalladas para este encuentro.'
        : 'El proveedor todavía no reporta jugadas para este encuentro.'"
    />
  </section>
</template>
