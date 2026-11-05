<script setup lang="ts">
import { ArrowRight, CalendarDays } from '@lucide/vue'
import type { PartidoLiga } from '~/types/partidosLiga'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

withDefaults(defineProps<{
  partido: PartidoLiga | PartidoSeoPublico
  competencia: string
  fecha: string
  estado: string
  rutaPartido?: string
  variante?: 'agenda' | 'jornada'
}>(), { variante: 'agenda', rutaPartido: '' })
</script>

<template>
  <article class="fila-partido" :class="{ 'fila-partido--jornada': variante === 'jornada' }" :aria-label="`${partido.local} contra ${partido.visitante}`">
    <div class="datos-competencia-fila">
      <strong>{{ competencia }}</strong>
      <span v-if="partido.jornada">{{ partido.jornada }}</span>
      <span v-if="estado !== 'PROGRAMADO'" class="estado-fila-partido" :class="{ 'estado-fila-partido--vivo': estado === 'EN VIVO' }">{{ estado }}</span>
    </div>
    <EquipoPartido :nombre="partido.local" :escudo="partido.escudoLocal" :slug="partido.equipoLocalSlug" alineacion="fila" />
    <span class="separador-equipos-fila">{{ partido.golesLocal !== null && partido.golesVisitante !== null ? `${partido.golesLocal}–${partido.golesVisitante}` : 'VS' }}</span>
    <EquipoPartido :nombre="partido.visitante" :escudo="partido.escudoVisitante" :slug="partido.equipoVisitanteSlug" alineacion="fila" />
    <time class="fecha-fila-partido" :datetime="partido.fechaIso"><CalendarDays aria-hidden="true" /> {{ fecha }}</time>
    <NuxtLink class="accion-fila-partido" :to="rutaPartido || `/partidos/${partido.slug}`" :aria-label="`Ver ${partido.local} contra ${partido.visitante}`">
      <span v-if="variante === 'jornada'" class="estado-fila-jornada">{{ estado }}</span><ArrowRight aria-hidden="true" />
    </NuxtLink>
  </article>
</template>

<style scoped>
.fila-partido {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 82px;
  grid-template-columns: minmax(120px, .75fr) minmax(135px, 1fr) auto minmax(135px, 1fr) minmax(190px, 1.05fr) 36px;
  align-items: center;
  gap: clamp(8px, 1vw, 16px);
  border-radius: 12px;
  background: var(--liga-superficie-secundaria, #f3f6fa);
  color: var(--liga-tinta, #102342);
  padding: 10px 16px 10px 22px;
}

.fila-partido::before {
  position: absolute;
  inset: 7px auto 7px 0;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: #ffd000;
  content: '';
}

.fila-partido--jornada {
  grid-template-columns: minmax(112px, .72fr) minmax(0, 1fr) auto minmax(0, 1fr) auto;
  min-height: 68px;
  gap: clamp(8px, .85vw, 14px);
  border-radius: 0;
  background: transparent;
  padding: 8px 10px;
}

.fila-partido--jornada .datos-competencia-fila { display: none; }
.fila-partido--jornada .identidad-equipo-partido--fila:nth-of-type(2) { grid-column: 2; grid-row: 1; }
.fila-partido--jornada .separador-equipos-fila { grid-column: 3; grid-row: 1; }
.fila-partido--jornada .identidad-equipo-partido--fila:nth-of-type(3) { grid-column: 4; grid-row: 1; }
.fila-partido--jornada .fecha-fila-partido { grid-column: 1; grid-row: 1; border: 0; padding: 0; font-weight: 700; white-space: normal; }
.fila-partido--jornada .accion-fila-partido { display: flex; width: auto; min-width: 78px; height: 32px; grid-column: 5; grid-row: 1; justify-content: center; gap: 5px; border-radius: 999px; background: #e9eff6; padding: 0 9px; }
.estado-fila-jornada { color: #19314e; font-size: .68rem; font-weight: 850; white-space: nowrap; }

.datos-competencia-fila {
  display: grid;
  gap: 3px;
  align-content: center;
  min-height: 40px;
  border-right: 1px solid var(--liga-borde, #d8e0e8);
  padding-right: 10px;
}

.datos-competencia-fila strong,
.datos-competencia-fila > span:not(.estado-fila-partido) {
  font-size: .82rem;
  line-height: 1.25;
}

.datos-competencia-fila > span:not(.estado-fila-partido) {
  color: var(--liga-tinta-suave, #52637b);
}

.estado-fila-partido {
  color: var(--liga-acento, #07528c);
  font-size: .6rem;
  font-weight: 850;
}

.estado-fila-partido--vivo {
  color: #b91c34;
}

.separador-equipos-fila {
  color: var(--liga-tinta-suave, #52637b);
  font-size: 1rem;
  font-weight: 850;
  white-space: nowrap;
}

.fecha-fila-partido {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  border-left: 1px solid var(--liga-borde, #d8e0e8);
  color: var(--liga-tinta, #102342);
  padding-left: 12px;
  font-size: .82rem;
  white-space: nowrap;
}

.fecha-fila-partido svg {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
}

.accion-fila-partido {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--liga-acento) 7%, var(--liga-superficie));
  color: var(--liga-tinta, #102342);
  transition: transform .18s ease, background-color .18s ease;
}

.accion-fila-partido:hover {
  transform: translateX(2px);
  background: color-mix(in srgb, var(--liga-acento) 14%, var(--liga-superficie));
}

.accion-fila-partido svg {
  width: 17px;
  height: 17px;
}

.accion-fila-partido:focus-visible {
  outline: 3px solid var(--liga-acento, #07528c);
  outline-offset: 3px;
}

@media (max-width: 900px) {
  .fila-partido {
    grid-template-columns: minmax(88px, .7fr) minmax(95px, 1fr) auto minmax(95px, 1fr) minmax(130px, 1fr) 34px;
    gap: 8px;
    padding: 10px 10px 10px 17px;
  }

  .fecha-fila-partido {
    gap: 7px;
    padding-left: 9px;
    font-size: .74rem;
  }

  .fila-partido--jornada { grid-template-columns: minmax(94px, .7fr) minmax(0, 1fr) auto minmax(0, 1fr) auto; gap: 7px; }
}

@media (max-width: 680px) {
  .fila-partido {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 32px;
    gap: 8px 6px;
    padding: 10px 9px 10px 14px;
  }

  .fila-partido--jornada { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 32px; gap: 7px 5px; padding: 9px 8px 9px 13px; }
  .fila-partido--jornada .fecha-fila-partido { grid-column: 1 / 4; grid-row: 1; }
  .fila-partido--jornada .identidad-equipo-partido--fila:nth-of-type(2) { grid-column: 1; grid-row: 2; }
  .fila-partido--jornada .separador-equipos-fila { grid-column: 2; grid-row: 2; }
  .fila-partido--jornada .identidad-equipo-partido--fila:nth-of-type(3) { grid-column: 3; grid-row: 2; }
  .fila-partido--jornada .accion-fila-partido { min-width: 32px; height: 32px; grid-column: 4; grid-row: 1 / 3; padding: 0 7px; }
  .fila-partido--jornada .estado-fila-jornada { display: none; }

  .datos-competencia-fila {
    grid-column: 1 / 4;
    grid-row: 1;
    min-height: 0;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    justify-content: start;
    border: 0;
    padding: 0;
  }

  .datos-competencia-fila strong,
  .datos-competencia-fila > span:not(.estado-fila-partido) {
    font-size: .7rem;
  }

  .datos-competencia-fila > span:not(.estado-fila-partido) {
    border-left: 1px solid var(--liga-borde, #d8e0e8);
    padding-left: 5px;
  }

  .datos-competencia-fila .estado-fila-partido {
    justify-self: end;
  }

  .separador-equipos-fila {
    font-size: .78rem;
  }

  .fecha-fila-partido {
    grid-column: 1 / 4;
    grid-row: 3;
    min-height: 0;
    border: 0;
    padding: 0;
    font-size: .7rem;
  }

  .fecha-fila-partido svg {
    width: 15px;
    height: 15px;
  }

  .accion-fila-partido {
    grid-column: 4;
    grid-row: 2 / 4;
    width: 32px;
    height: 32px;
  }
}
</style>
