<script setup lang="ts">
import { CornerDownRight } from '@lucide/vue'
import type { EventoPartido } from '~/types/resultados'

defineProps<{ eventos: EventoPartido[] }>()
</script>

<template>
  <section class="panel-resultados panel-eventos" aria-labelledby="titulo-eventos-partido">
    <h2 id="titulo-eventos-partido">Eventos del partido</h2>
    <ol>
      <li v-for="evento in eventos" :key="evento.id" :class="`evento-${evento.tipo}`">
        <time>{{ evento.minuto }}</time>
        <IconoEventoPartido :tipo="evento.tipo" />
        <div><strong>{{ evento.jugador }}</strong><small v-if="evento.detalle"><CornerDownRight aria-hidden="true" />{{ evento.detalle }}</small></div>
        <b v-if="evento.marcador">{{ evento.marcador }}</b>
      </li>
    </ol>
  </section>
</template>
