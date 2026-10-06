<script setup lang="ts">
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

defineProps<{
  partido: PartidoSeoPublico
  fechaCompleta: (fecha: string) => string
  fechaPartido: (fecha: string, hora?: boolean) => string
  etiquetaEstado: (estado: string | null) => string
  marcador: (partido: PartidoSeoPublico) => string
  rutaEquipoPartido: (partido: PartidoSeoPublico, local: boolean) => string | null
  nombreEquipo: (partido: PartidoSeoPublico, local: boolean) => string
  escudoEquipo: (partido: PartidoSeoPublico, local: boolean) => string | null
  iniciales: (nombre: string) => string
}>()
</script>

<template>
  <article class="tarjeta-partido-liga tarjeta-partido-competicion">
    <div class="meta-partido-liga">
      <span>{{ partido.jornada || 'Fecha por confirmar' }}</span>
      <span class="estado-partido-liga" :class="{ 'estado-partido-liga--vivo': etiquetaEstado(partido.estado) === 'EN VIVO' }">{{ etiquetaEstado(partido.estado) }}</span>
    </div>
    <time class="fecha-partido-liga" :datetime="partido.fechaIso">{{ fechaCompleta(partido.fechaIso) }}</time>
    <div class="equipos-partido-liga">
      <span class="equipo-liga">
        <img v-if="escudoEquipo(partido, true)" :src="escudoEquipo(partido, true)!" :alt="`Escudo de ${nombreEquipo(partido, true)}`" width="34" height="34" loading="lazy">
        <span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(nombreEquipo(partido, true)) }}</span>
        <NuxtLink v-if="rutaEquipoPartido(partido, true)" :to="rutaEquipoPartido(partido, true)!"><strong>{{ nombreEquipo(partido, true) }}</strong></NuxtLink>
        <strong v-else>{{ nombreEquipo(partido, true) }}</strong>
      </span>
      <span class="versus-liga">{{ marcador(partido) }}</span>
      <span class="equipo-liga visitante">
        <NuxtLink v-if="rutaEquipoPartido(partido, false)" :to="rutaEquipoPartido(partido, false)!"><strong>{{ nombreEquipo(partido, false) }}</strong></NuxtLink>
        <strong v-else>{{ nombreEquipo(partido, false) }}</strong>
        <img v-if="escudoEquipo(partido, false)" :src="escudoEquipo(partido, false)!" :alt="`Escudo de ${nombreEquipo(partido, false)}`" width="34" height="34" loading="lazy">
        <span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(nombreEquipo(partido, false)) }}</span>
      </span>
    </div>
    <p v-if="partido.estadio || partido.ciudad" class="sede-partido-liga">{{ partido.estadio }}<template v-if="partido.estadio && partido.ciudad"> · </template>{{ partido.ciudad }}</p>
    <nav class="enlaces-partido-liga" :aria-label="`Información de ${partido.local} vs ${partido.visitante}`">
      <NuxtLink :to="`/partidos/${encodeURIComponent(partido.slug)}`">Ficha del partido <span aria-hidden="true">→</span></NuxtLink>
    </nav>
  </article>
</template>

<style scoped>
.tarjeta-partido-competicion { height: 100%; padding: 16px; border: 1px solid #294362; border-radius: 12px; background: #10243d; color: #edf3ff; }
.meta-partido-liga { display: flex; justify-content: space-between; gap: 10px; color: #78dcf4; font-size: .82rem; font-weight: 800; }
.meta-partido-liga .estado-partido-liga { flex: 0 0 auto; padding: 3px 8px; border-radius: 999px; background: rgb(122 148 177 / 18%); font-size: .7rem; }
.meta-partido-liga .estado-partido-liga--vivo { background: #b91c34; color: #fff; }
.fecha-partido-liga, .sede-partido-liga { display: block; margin: 10px 0; color: #afc2db; font-size: .82rem; }
.equipos-partido-liga { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; }
.equipo-liga { display: flex; align-items: center; gap: 8px; min-width: 0; }
.equipo-liga.visitante { justify-content: flex-end; text-align: right; }
.equipo-liga img { width: 34px; height: 34px; flex: 0 0 auto; object-fit: contain; }
.equipo-liga strong { overflow-wrap: anywhere; }
.versus-liga { color: #ffd343; font-weight: 900; white-space: nowrap; }
.escudo-fallback { display: inline-grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 50%; background: #17466b; color: #fff; font-size: .66rem; }
.sede-partido-liga { margin-bottom: 0; }
.enlaces-partido-liga { display: flex; gap: 14px; margin-top: 12px; }
.enlaces-partido-liga a { color: #78dcf4; font-size: .82rem; font-weight: 800; }
.equipo-liga a { color: inherit; text-decoration: none; }
.equipo-liga a:hover, .equipo-liga a:focus-visible { text-decoration: underline; }
:global(body.tema-publico-blanco) .tarjeta-partido-competicion { border-color: #dce5f1; background: #fff; color: #13253d; }
:global(body.tema-publico-blanco) .fecha-partido-liga,
:global(body.tema-publico-blanco) .sede-partido-liga { color: #586980; }
:global(body.tema-publico-blanco) .enlaces-partido-liga a { color: #145996; }
:global(body.tema-publico-blanco) .estado-partido-liga { background: #e7eef7; color: #4b5f78; }
:global(body.tema-publico-blanco) .estado-partido-liga--vivo { background: #b91c34; color: #fff; }
@media (max-width: 520px) { .tarjeta-partido-competicion { padding: 13px; } .equipos-partido-liga { gap: 5px; } .equipo-liga { gap: 5px; } .equipo-liga img, .escudo-fallback { width: 28px; height: 28px; flex-basis: 28px; } }
</style>
