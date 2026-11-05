<script setup lang="ts">
import { ArrowRight, ExternalLink } from '@lucide/vue'

interface DatosPartidoSeleccion {
  fecha: string
  local: string
  visitante: string
  competencia: string
  seleccion?: string
  hora?: string | null
  estadio?: string
  sede?: string
  marcadorLocal?: number
  marcadorVisitante?: number
  marcadorPendiente?: boolean
}

const props = defineProps<{
  partido: DatosPartidoSeleccion
  variante: 'agenda' | 'resultado'
  destino: string
  destinoExterno?: boolean
  mostrarSeleccion?: boolean
  etiquetaDestino?: string
}>()

const partesFecha = computed(() => {
  const fecha = new Date(`${props.partido.fecha}T12:00:00-05:00`)
  return {
    diaSemana: new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'America/Bogota' }).format(fecha).replace('.', ''),
    dia: new Intl.DateTimeFormat('es-CO', { day: 'numeric', timeZone: 'America/Bogota' }).format(fecha),
    mes: new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'America/Bogota' }).format(fecha).replace('.', '')
  }
})

const nombreBandera = (equipo: string) => equipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').replace(/\s+/g, '-')
const marcador = computed(() => props.partido.marcadorPendiente || props.partido.marcadorLocal === undefined || props.partido.marcadorVisitante === undefined
  ? '—'
  : `${props.partido.marcadorLocal} – ${props.partido.marcadorVisitante}`)
</script>

<template>
  <component :is="destinoExterno ? 'a' : 'NuxtLink'" class="tarjeta-partido-seleccion" :class="`tarjeta-partido-seleccion--${variante}`" :href="destinoExterno ? destino : undefined" :to="destinoExterno ? undefined : destino" :target="destinoExterno ? '_blank' : undefined" :rel="destinoExterno ? 'noopener noreferrer' : undefined">
    <time class="fecha-partido-seleccion" :datetime="partido.fecha">
      <span>{{ partesFecha.diaSemana }}</span><strong>{{ partesFecha.dia }}</strong><span>{{ partesFecha.mes }}</span>
    </time>
    <div class="detalle-partido-seleccion">
      <div v-if="variante === 'agenda' && mostrarSeleccion" class="etiquetas-agenda-partido-seleccion">
        <span class="etiqueta-seleccion-partido" :class="{ 'etiqueta-seleccion-partido--femenina': partido.seleccion?.toLowerCase().includes('femenina') }">{{ partido.seleccion || 'Selección Colombia' }}</span>
        <span class="etiqueta-competencia-partido">{{ partido.competencia }}</span>
      </div>
      <small v-else>{{ partido.competencia }}</small>
      <div class="equipos-partido-seleccion">
        <span class="equipo-partido-seleccion"><span class="bandera-seleccion" :class="`bandera-seleccion--${nombreBandera(partido.local)}`" aria-hidden="true" />{{ partido.local }}</span>
        <span v-if="variante === 'agenda'" class="separador-partido-seleccion" aria-label="contra">vs</span>
        <span v-else class="marcador-partido-seleccion" :aria-label="partido.marcadorPendiente ? 'Resultado pendiente de confirmación' : `Marcador ${marcador}`">{{ marcador }}</span>
        <span class="equipo-partido-seleccion"><span class="bandera-seleccion" :class="`bandera-seleccion--${nombreBandera(partido.visitante)}`" aria-hidden="true" />{{ partido.visitante }}</span>
      </div>
    </div>
    <div class="meta-partido-seleccion">
      <span>{{ variante === 'agenda' ? partido.hora || 'Hora por confirmar' : partido.marcadorPendiente ? 'Marcador pendiente' : 'Finalizado' }}</span>
      <small v-if="variante === 'agenda' && (partido.estadio || partido.sede)">{{ partido.estadio ? `${partido.estadio} · ` : '' }}{{ partido.sede }}</small>
      <small v-if="variante === 'agenda' && etiquetaDestino" class="fuente-partido-seleccion"><ExternalLink aria-hidden="true" />{{ etiquetaDestino }}</small>
    </div>
    <ArrowRight class="flecha-partido-seleccion" aria-hidden="true" />
  </component>
</template>

<style scoped>
.tarjeta-partido-seleccion { position: relative; display: grid; min-height: 60px; grid-template-columns: 58px minmax(0, 1fr) minmax(160px, .62fr) 18px; align-items: center; gap: 12px; overflow: hidden; border: 1px solid #dbe5f1; border-radius: 12px; background: linear-gradient(105deg, #fff, #f8fafc); color: #10213e; padding: 7px 12px 7px 0; text-decoration: none; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.tarjeta-partido-seleccion::before { position: absolute; inset: 0 auto 0 0; width: 5px; background: #ffd21c; content: ''; }
.tarjeta-partido-seleccion:hover, .tarjeta-partido-seleccion:focus-visible { transform: translateY(-1px); border-color: #91b4df; box-shadow: 0 7px 18px rgb(18 55 100 / 9%); outline: none; }
.tarjeta-partido-seleccion:focus-visible { box-shadow: 0 0 0 3px rgb(13 101 188 / 28%); }
.fecha-partido-seleccion { display: grid; justify-items: center; gap: 0; border-right: 1px solid #dbe4ed; color: #425b7b; font-size: .72rem; line-height: 1.06; text-transform: capitalize; }
.fecha-partido-seleccion strong { color: #10213e; font-size: 1.24rem; line-height: 1.05; }
.detalle-partido-seleccion { display: grid; min-width: 0; gap: 5px; }
.etiquetas-agenda-partido-seleccion { display: flex; min-width: 0; flex-wrap: wrap; gap: 5px; }
.etiqueta-seleccion-partido, .etiqueta-competencia-partido { display: inline-flex; min-height: 20px; align-items: center; border-radius: 999px; background: #dceaff; padding: 2px 9px; color: #0758a4; font-size: .67rem; font-weight: 850; line-height: 1.2; }
.etiqueta-seleccion-partido--femenina { background: #efe5ff; color: #6823a2; }
.etiqueta-competencia-partido { background: #edf1f6; color: #344760; font-weight: 650; }
.detalle-partido-seleccion > small { overflow: hidden; color: #50627c; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.equipos-partido-seleccion { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; }
.equipo-partido-seleccion { display: flex; min-width: 0; align-items: center; gap: 8px; color: #101e3c; font-size: .9rem; font-weight: 850; }
.equipo-partido-seleccion:last-child { justify-content: flex-end; }
.separador-partido-seleccion { color: #4a5b73; font-size: .78rem; font-weight: 800; }
.bandera-seleccion { position: relative; display: inline-block; width: 26px; height: 26px; flex: 0 0 26px; overflow: hidden; border: 1px solid rgb(10 30 55 / 8%); border-radius: 50%; box-shadow: 0 1px 3px rgb(12 34 58 / 14%); }
.bandera-seleccion--colombia { background: linear-gradient(to bottom, #fcd116 0 50%, #003893 50% 75%, #ce1126 75%); }
.bandera-seleccion--chile { background: linear-gradient(to bottom, #fff 0 50%, #d52b1e 50%); }
.bandera-seleccion--chile::before { position: absolute; top: 0; left: 0; width: 48%; height: 50%; background: #0039a6; content: ''; }
.bandera-seleccion--australia { background: #012169; }
.bandera-seleccion--australia::after { position: absolute; top: 22%; right: 18%; color: #fff; content: '✦'; font-size: 10px; }
.bandera-seleccion--mexico { background: linear-gradient(to right, #006847 0 33%, #fff 33% 66%, #ce1126 66%); }
.bandera-seleccion--paraguay { background: linear-gradient(to bottom, #d52b1e 0 33%, #fff 33% 66%, #0038a8 66%); }
.bandera-seleccion--venezuela { background: linear-gradient(to bottom, #f4c300 0 33%, #0033a0 33% 66%, #cf142b 66%); }
.bandera-seleccion--peru { background: linear-gradient(to right, #d91023 0 33%, #fff 33% 66%, #d91023 66%); }
.marcador-partido-seleccion { min-width: 68px; border-radius: 999px; background: #e9eef5; padding: 5px 10px; color: #10213e; font-size: .92rem; font-weight: 900; text-align: center; white-space: nowrap; }
.meta-partido-seleccion { display: grid; min-width: 0; gap: 3px; border-left: 1px solid #dbe4ed; padding-left: 14px; color: #293c59; font-size: .78rem; }
.meta-partido-seleccion > span, .meta-partido-seleccion > small { overflow: hidden; text-overflow: ellipsis; }
.meta-partido-seleccion > small { color: #536782; font-size: .7rem; }
.meta-partido-seleccion .fuente-partido-seleccion { display: inline-flex; align-items: center; gap: 4px; color: #075ba9; font-size: .72rem; font-weight: 800; }
.fuente-partido-seleccion svg { width: 13px; height: 13px; }
.flecha-partido-seleccion { width: 17px; height: 17px; color: #0a2d5c; }
@media (max-width: 980px) {
  .tarjeta-partido-seleccion { grid-template-columns: 52px minmax(0, 1fr) 16px; gap: 10px; }
  .meta-partido-seleccion { grid-column: 2; grid-row: 2; border: 0; padding: 0; }
  .flecha-partido-seleccion { grid-column: 3; grid-row: 1 / span 2; }
}
@media (max-width: 540px) {
  .tarjeta-partido-seleccion { grid-template-columns: 42px minmax(0, 1fr) 14px; gap: 8px; padding-right: 9px; }
  .fecha-partido-seleccion { font-size: .65rem; }
  .fecha-partido-seleccion strong { font-size: 1.1rem; }
  .equipos-partido-seleccion { gap: 4px; }
  .equipo-partido-seleccion { gap: 5px; font-size: .76rem; }
  .bandera-seleccion { width: 22px; height: 22px; flex-basis: 22px; }
  .marcador-partido-seleccion { min-width: 52px; padding: 4px 6px; font-size: .78rem; }
  .meta-partido-seleccion { font-size: .72rem; }
}
:global(body.tema-publico-azul) .tarjeta-partido-seleccion { border-color: #2b4564; background: linear-gradient(110deg, #0e233e, #132d4b); color: #f4f7fc; }
:global(body.tema-publico-azul) .detalle-partido-seleccion > small, :global(body.tema-publico-azul) .meta-partido-seleccion, :global(body.tema-publico-azul) .meta-partido-seleccion > small { color: #c3d4e9; }
:global(body.tema-publico-azul) .equipo-partido-seleccion, :global(body.tema-publico-azul) .fecha-partido-seleccion strong, :global(body.tema-publico-azul) .marcador-partido-seleccion { color: #f4f7fc; }
:global(body.tema-publico-azul) .fecha-partido-seleccion, :global(body.tema-publico-azul) .meta-partido-seleccion { border-color: #324c6a; }
:global(body.tema-publico-azul) .marcador-partido-seleccion { background: #233b58; }
@media (prefers-reduced-motion: reduce) { .tarjeta-partido-seleccion { transition: none; } }
</style>
