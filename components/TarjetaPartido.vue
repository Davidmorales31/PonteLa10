<script setup lang="ts">
import { ArrowRight, CalendarDays, FileText } from '@lucide/vue'
import type { PartidoLiga } from '~/types/partidosLiga'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

defineProps<{
  partido: PartidoLiga | PartidoSeoPublico
  competencia: string
  fecha: string
  estado: string
  rutaPartido?: string
}>()
</script>

<template>
  <article class="tarjeta-partido" :aria-label="`${partido.local} contra ${partido.visitante}`">
    <header class="cabecera-tarjeta-partido">
      <p><strong>{{ competencia }}</strong><span v-if="partido.jornada"> · {{ partido.jornada }}</span></p>
      <span class="estado-tarjeta-partido" :class="{ 'estado-tarjeta-partido--vivo': estado === 'EN VIVO' }">{{ estado }}</span>
    </header>

    <div class="equipos-tarjeta-partido">
      <EquipoPartido :nombre="partido.local" :escudo="partido.escudoLocal" :slug="partido.equipoLocalSlug" alineacion="local" />
      <span class="separador-equipos-partido">{{ partido.golesLocal !== null && partido.golesVisitante !== null ? `${partido.golesLocal}–${partido.golesVisitante}` : 'VS' }}</span>
      <EquipoPartido :nombre="partido.visitante" :escudo="partido.escudoVisitante" :slug="partido.equipoVisitanteSlug" alineacion="visitante" />
    </div>

    <footer class="pie-tarjeta-partido">
      <p><CalendarDays aria-hidden="true" /><time :datetime="partido.fechaIso">{{ fecha }}</time></p>
      <NuxtLink :to="rutaPartido || `/partidos/${partido.slug}`">
        <FileText aria-hidden="true" /> Ficha del partido <ArrowRight aria-hidden="true" />
      </NuxtLink>
    </footer>
  </article>
</template>

<style scoped>
.tarjeta-partido {
  display: grid;
  min-width: 0;
  min-height: 176px;
  grid-template-rows: auto 1fr auto;
  border: 1px solid var(--liga-borde, #d8e0e8);
  border-radius: 15px;
  background: var(--liga-superficie, #fff);
  color: var(--liga-tinta, #102342);
  box-shadow: 0 4px 14px rgb(12 39 67 / 5%);
  padding: 13px 15px 0;
}

.cabecera-tarjeta-partido {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--liga-borde, #d8e0e8);
  padding-bottom: 9px;
}

.cabecera-tarjeta-partido p {
  min-width: 0;
  margin: 0;
  color: var(--liga-tinta-suave, #52637b);
  font-size: .8rem;
}

.cabecera-tarjeta-partido p strong {
  color: var(--liga-tinta, #102342);
  font-weight: 800;
}

.estado-tarjeta-partido {
  flex: 0 0 auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--liga-tinta-suave, #52637b) 13%, transparent);
  color: var(--liga-tinta, #102342);
  padding: 4px 9px;
  font-size: .63rem;
  font-weight: 850;
}

.estado-tarjeta-partido--vivo {
  background: #b91c34;
  color: #fff;
}

.equipos-tarjeta-partido {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 11px 0;
}

.separador-equipos-partido {
  color: var(--liga-tinta-suave, #52637b);
  font-size: .82rem;
  font-weight: 800;
  white-space: nowrap;
}

.pie-tarjeta-partido {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid var(--liga-borde, #d8e0e8);
  padding: 10px 0;
}

.pie-tarjeta-partido p,
.pie-tarjeta-partido a {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: .73rem;
}

.pie-tarjeta-partido p {
  color: var(--liga-tinta, #102342);
}

.pie-tarjeta-partido a {
  color: var(--liga-acento, #07528c);
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.pie-tarjeta-partido svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.pie-tarjeta-partido a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 620px) {
  .tarjeta-partido {
    min-height: 158px;
    border-radius: 13px;
    padding: 11px 11px 0;
  }

  .cabecera-tarjeta-partido p {
    font-size: .72rem;
  }

  .estado-tarjeta-partido {
    padding: 3px 6px;
    font-size: .56rem;
  }

  .equipos-tarjeta-partido {
    gap: 6px;
    padding: 9px 0;
  }

  .pie-tarjeta-partido {
    flex-direction: row;
    gap: 6px;
    padding: 9px 0;
  }

  .pie-tarjeta-partido p,
  .pie-tarjeta-partido a {
    font-size: .66rem;
  }
}
</style>
