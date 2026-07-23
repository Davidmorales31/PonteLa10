<script setup lang="ts">
import { MapPin } from '@lucide/vue'
import type { PartidoResultado } from '~/types/resultados'

withDefaults(defineProps<{ partido: PartidoResultado; mostrarEnlace?: boolean }>(), { mostrarEnlace: true })
</script>

<template>
  <article class="partido-destacado-resultados">
    <header>
      <div>
        <span>{{ partido.competencia }}</span>
        <small>{{ partido.jornada }}</small>
      </div>
      <EtiquetaEstadoPartido :partido="partido" />
    </header>
    <div class="marcador-destacado">
      <div class="equipo-destacado equipo-local">
        <EscudoEquipo :equipo="partido.equipoLocal" tamano="grande" />
        <strong>{{ partido.equipoLocal.nombre }}</strong>
      </div>
      <div class="resultado-destacado">
        <b>{{ partido.marcadorLocal ?? '-' }} <span>-</span> {{ partido.marcadorVisitante ?? '-' }}</b>
        <small>{{ partido.periodo || (partido.estado === 'en-vivo' ? `Minuto ${partido.minuto}` : partido.estado === 'finalizado' ? 'Partido finalizado' : 'Próximo partido') }}</small>
      </div>
      <div class="equipo-destacado equipo-visitante">
        <EscudoEquipo :equipo="partido.equipoVisitante" tamano="grande" />
        <strong>{{ partido.equipoVisitante.nombre }}</strong>
      </div>
    </div>
    <footer v-if="partido.estadio || partido.ciudad">
      <MapPin aria-hidden="true" />
      {{ [partido.estadio, partido.ciudad].filter(Boolean).join(', ') }}
    </footer>
    <NuxtLink v-if="mostrarEnlace" class="enlace-detalle-partido" :to="`/resultados/${partido.id}`">Ver detalles del partido</NuxtLink>
  </article>
</template>
