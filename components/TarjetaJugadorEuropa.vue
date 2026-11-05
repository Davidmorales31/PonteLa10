<script setup lang="ts">
import { ArrowUpRight, CalendarDays } from '@lucide/vue'
import type { PerfilJugadorEuropa } from '~/data/jugadoresColombianosEuropa'

defineProps<{ jugador: PerfilJugadorEuropa }>()
const imagenFallida = ref(false)
</script>

<template>
  <article class="tarjeta-jugador-europa">
    <NuxtLink class="perfil-tarjeta-jugador" :to="`/jugadores/${jugador.slug}`" :aria-label="`Ver perfil de ${jugador.nombre}, ${jugador.club}`">
      <div v-if="!imagenFallida" class="retrato-tarjeta-jugador" aria-hidden="true">
        <img :src="jugador.imagenPerfil" alt="" width="400" height="400" loading="lazy" decoding="async" @error="imagenFallida = true">
      </div>
      <div class="identidad-tarjeta-jugador">
        <span class="liga-tarjeta-jugador">{{ jugador.competencia }}</span>
        <h3>{{ jugador.nombre }}</h3>
        <p>{{ jugador.club }}</p>
        <small>{{ jugador.posicion }}</small>
      </div>
      <span class="flecha-tarjeta-jugador" aria-hidden="true"><ArrowUpRight /></span>
    </NuxtLink>
    <footer class="pie-tarjeta-jugador">
      <PublicoBotonSeguirJugador :slug="jugador.slug" :nombre="jugador.nombre" compacto />
      <a :href="jugador.calendarioOficialUrl" target="_blank" rel="noopener noreferrer" :aria-label="jugador.calendarioOficialEtiqueta"><CalendarDays aria-hidden="true" /><span>Calendario</span></a>
    </footer>
  </article>
</template>

<style scoped>
.tarjeta-jugador-europa { min-width: 0; overflow: hidden; border: 1px solid var(--europa-borde, #dce5ef); border-radius: 16px; background: var(--europa-superficie, #fff); box-shadow: 0 5px 15px rgb(23 58 97 / 6%); }
.perfil-tarjeta-jugador { position: relative; display: flex; min-height: 154px; align-items: center; overflow: hidden; padding: 17px; text-decoration: none; }
.retrato-tarjeta-jugador { position: absolute; inset: 0 0 0 auto; width: 49%; overflow: hidden; }
.retrato-tarjeta-jugador::after { position: absolute; inset: 0; background: linear-gradient(90deg, var(--europa-superficie, #fff), transparent 70%); content: ''; }
.retrato-tarjeta-jugador img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 20%; transition: transform .25s ease; }
.perfil-tarjeta-jugador:hover .retrato-tarjeta-jugador img { transform: scale(1.035); }
.identidad-tarjeta-jugador { position: relative; z-index: 1; width: 61%; min-width: 0; }
.liga-tarjeta-jugador { display: block; color: var(--europa-acento, #075ba9); font-size: .65rem; font-weight: 800; line-height: 1.25; }
.identidad-tarjeta-jugador h3 { margin: 6px 0 5px; color: var(--europa-tinta, #0b2347); font-size: 1.1rem; font-weight: 900; letter-spacing: -.025em; line-height: 1.12; }
.identidad-tarjeta-jugador p { margin: 0; color: var(--europa-tinta-suave, #405778); font-size: .77rem; font-weight: 700; line-height: 1.3; }
.identidad-tarjeta-jugador small { display: block; margin-top: 5px; color: var(--europa-tinta-suave, #405778); font-size: .7rem; }
.flecha-tarjeta-jugador { position: absolute; top: 9px; right: 9px; display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #d7e4f1; border-radius: 50%; background: rgb(255 255 255 / 90%); color: #145e99; }
.flecha-tarjeta-jugador svg { width: 15px; height: 15px; }
.pie-tarjeta-jugador { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 5px; border-top: 1px solid var(--europa-borde, #dce5ef); padding: 8px 11px; }
.pie-tarjeta-jugador > a { display: inline-flex; min-height: 34px; align-items: center; gap: 5px; color: var(--europa-acento, #075ba9); font-size: .7rem; font-weight: 800; text-decoration: none; }
.pie-tarjeta-jugador > a svg { width: 15px; height: 15px; }
.perfil-tarjeta-jugador:focus-visible, .pie-tarjeta-jugador > a:focus-visible { outline: 3px solid #1689cb; outline-offset: -3px; border-radius: 7px; }
@media (max-width: 600px) { .perfil-tarjeta-jugador { min-height: 143px; padding: 13px; } .identidad-tarjeta-jugador h3 { font-size: 1rem; } .pie-tarjeta-jugador > a span { display: none; } }
@media (prefers-reduced-motion: reduce) { .retrato-tarjeta-jugador img { transition: none; } }
</style>
