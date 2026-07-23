<script setup lang="ts">
import { ArrowLeftRight, CircleDot, Square } from '@lucide/vue'
import type { EventoPartido } from '~/types/resultados'

defineProps<{ eventos: EventoPartido[] }>()
</script>

<template>
  <section class="panel-resultados panel-eventos" aria-labelledby="titulo-eventos-partido">
    <h2 id="titulo-eventos-partido">Eventos del partido</h2>
    <ol>
      <li v-for="evento in eventos" :key="evento.id" :class="`evento-${evento.tipo}`">
        <time>{{ evento.minuto }}</time>
        <CircleDot v-if="evento.tipo === 'gol'" aria-hidden="true" />
        <ArrowLeftRight v-else-if="evento.tipo === 'cambio'" aria-hidden="true" />
        <Square v-else aria-hidden="true" />
        <div><strong>{{ evento.jugador }}</strong><small>{{ evento.detalle }}</small></div>
        <b v-if="evento.marcador">{{ evento.marcador }}</b>
      </li>
    </ol>
  </section>
</template>
