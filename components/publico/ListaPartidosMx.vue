<script setup lang="ts">
import type { PartidoLigaMx } from '~/types/ligaMx'
import { estaEnJuego, estaFinalizado, marcador } from '~/utils/ligaMxVista'

withDefaults(defineProps<{ partidos: PartidoLigaMx[], titulo: string, mostrarLiga?: boolean }>(), { mostrarLiga: false })
const { sitio } = useSitio()

const formato = computed(() => new Intl.DateTimeFormat(sitio.value.locale, {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: sitio.value.zonaHoraria
}))
const cuando = (partido: PartidoLigaMx) => formato.value.format(new Date(partido.fechaIso))
const etiquetaEstado = (partido: PartidoLigaMx) => estaEnJuego(partido) ? 'En juego'
  : partido.estado === 'postponed' ? 'Aplazado'
  : partido.estado === 'suspended' || partido.estado === 'abandoned' ? 'Suspendido'
  : partido.estado === 'cancelled' ? 'Cancelado'
  : estaFinalizado(partido) ? 'Final' : ''
</script>

<template>
  <section class="partidos-mx" :aria-label="titulo">
    <h3>{{ titulo }}</h3>
    <ul v-if="partidos.length">
      <li v-for="partido in partidos" :key="partido.id">
        <time :datetime="partido.fechaIso">{{ cuando(partido) }}</time>
        <span class="cruce">
          <span class="local">{{ partido.local }}</span>
          <strong>{{ marcador(partido) }}</strong>
          <span class="visitante">{{ partido.visitante }}</span>
        </span>
        <small>
          <span v-if="etiquetaEstado(partido)" class="estado">{{ etiquetaEstado(partido) }}</span>
          <span v-if="mostrarLiga">{{ partido.competenciaNombre }} · </span>{{ partido.jornada }}<span v-if="partido.estadio"> · {{ partido.estadio }}</span>
        </small>
      </li>
    </ul>
    <p v-else class="vacio">Sin partidos para mostrar.</p>
  </section>
</template>

<style scoped>
.partidos-mx h3 { margin: 0 0 8px; color: #9eafc8; font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.partidos-mx ul { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.partidos-mx li { display: grid; gap: 4px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, .1); }
.partidos-mx time { display: block; color: #9eafc8; font-size: .74rem; font-weight: 700; }
.partidos-mx time::first-letter { text-transform: uppercase; }
.cruce { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; color: #f5f8ff; font-weight: 750; }
.cruce .local { text-align: right; }
.cruce strong { min-width: 3.4rem; text-align: center; color: #ffd800; font-variant-numeric: tabular-nums; }
.partidos-mx small { color: #9eafc8; font-size: .72rem; }
.estado { margin-right: 6px; padding: 1px 6px; border-radius: 999px; background: #174ea6; color: #fff; font-weight: 800; }
.vacio { margin: 0; color: #9eafc8; font-size: .86rem; }
</style>
