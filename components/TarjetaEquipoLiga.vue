<script setup lang="ts">
import { ArrowUpRight, Star } from '@lucide/vue'
import type { EquipoCompeticionPublica } from '~/server/utils/competicionesPublicas'

defineProps<{
  equipo: EquipoCompeticionPublica
  jugadorDestacado: string
  fotoJugador?: string | null
  mostrarFigura?: boolean
}>()
</script>

<template>
  <NuxtLink
    v-if="equipo.slug"
    class="tarjeta-equipo-liga"
    :class="{ 'tarjeta-equipo-liga--solo-club': !mostrarFigura && !fotoJugador }"
    :to="`/equipos/${encodeURIComponent(equipo.slug)}`"
    :aria-label="mostrarFigura && jugadorDestacado ? `${equipo.nombre}, figura destacada ${jugadorDestacado}. Ver equipo` : `Ver equipo ${equipo.nombre}`"
  >
    <span v-if="fotoJugador" class="imagen-jugador-equipo" aria-hidden="true">
      <img :src="fotoJugador" alt="" width="640" height="640" loading="lazy">
    </span>
    <span class="escudo-equipo-liga">
      <EscudoEquipoPublico v-if="equipo.escudo" :src="equipo.escudo" :alt="`Escudo oficial de ${equipo.nombre}`" :width="58" :height="58" sizes="58px" loading="lazy" />
      <span v-else aria-hidden="true">{{ equipo.nombre.slice(0, 2).toLocaleUpperCase('es-CO') }}</span>
    </span>
    <span class="contenido-equipo-liga">
      <strong>{{ equipo.nombre }}</strong>
      <template v-if="mostrarFigura && jugadorDestacado"><span class="etiqueta-figura-equipo"><Star aria-hidden="true" /> Figura del club</span><span class="nombre-figura-equipo">{{ jugadorDestacado }}</span></template>
    </span>
    <span class="accion-tarjeta-equipo" aria-hidden="true"><ArrowUpRight /></span>
  </NuxtLink>
  <article v-else class="tarjeta-equipo-liga tarjeta-equipo-liga--sin-ficha" :class="{ 'tarjeta-equipo-liga--solo-club': !mostrarFigura && !fotoJugador }">
    <span v-if="fotoJugador" class="imagen-jugador-equipo" aria-hidden="true">
      <img :src="fotoJugador" alt="" width="640" height="640" loading="lazy">
    </span>
    <span class="escudo-equipo-liga">
      <EscudoEquipoPublico v-if="equipo.escudo" :src="equipo.escudo" :alt="`Escudo oficial de ${equipo.nombre}`" :width="58" :height="58" sizes="58px" loading="lazy" />
      <span v-else aria-hidden="true">{{ equipo.nombre.slice(0, 2).toLocaleUpperCase('es-CO') }}</span>
    </span>
    <span class="contenido-equipo-liga">
      <strong>{{ equipo.nombre }}</strong>
      <template v-if="mostrarFigura && jugadorDestacado"><span class="etiqueta-figura-equipo"><Star aria-hidden="true" /> Figura del club</span><span class="nombre-figura-equipo">{{ jugadorDestacado }}</span></template>
    </span>
  </article>
</template>

<style scoped>
.tarjeta-equipo-liga { position: relative; display: flex; min-width: 0; height: 132px; align-items: center; overflow: hidden; border: 1px solid #dce6f2; border-radius: 15px; background: #fff; color: #0b2347; text-decoration: none; box-shadow: 0 5px 15px rgb(23 58 97 / 7%); transition: transform .2s ease, box-shadow .2s ease; }
.imagen-jugador-equipo { position: absolute; z-index: 0; inset: 0 0 0 auto; width: 43%; overflow: hidden; pointer-events: none; }
.imagen-jugador-equipo::after { position: absolute; inset: 0; background: linear-gradient(90deg, #fff 0%, rgb(255 255 255 / 88%) 16%, rgb(255 255 255 / 48%) 44%, rgb(255 255 255 / 8%) 100%), linear-gradient(0deg, rgb(9 35 63 / 26%) 0%, transparent 60%); content: ''; }
.imagen-jugador-equipo img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 22%; }
.tarjeta-equipo-liga:hover, .tarjeta-equipo-liga:focus-visible { transform: translateY(-3px); border-color: #a7c4e3; box-shadow: 0 15px 30px rgb(23 58 97 / 16%); }
.tarjeta-equipo-liga:focus-visible { outline: 3px solid #1689cb; outline-offset: 3px; }
.escudo-equipo-liga { position: absolute; z-index: 1; left: 14px; display: grid; width: 52px; height: 52px; place-items: center; }
.escudo-equipo-liga :deep(img) { display: block; width: 50px; height: 50px; object-fit: contain; }
.contenido-equipo-liga { position: relative; z-index: 1; display: grid; width: auto; min-width: 0; align-content: center; gap: 5px; margin-left: 76px; margin-right: 82px; }
.contenido-equipo-liga > strong { color: #0b2347; font-size: .96rem; line-height: 1.16; }
.tarjeta-equipo-liga--solo-club .contenido-equipo-liga { margin-right: 42px; }
.etiqueta-figura-equipo { display: flex; align-items: center; gap: 5px; color: #2874ac; font-size: .72rem; font-weight: 750; }
.etiqueta-figura-equipo :deep(svg) { width: 13px; height: 13px; flex: 0 0 auto; color: #e6ad00; }
.nombre-figura-equipo { overflow: hidden; color: #3d526d; font-size: .82rem; font-weight: 650; line-height: 1.2; text-overflow: ellipsis; }
.accion-tarjeta-equipo { position: absolute; z-index: 2; top: 10px; right: 10px; display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid #d7e4f1; border-radius: 50%; background: rgb(255 255 255 / 86%); color: #145e99; }
.accion-tarjeta-equipo :deep(svg) { width: 15px; height: 15px; }
.tarjeta-equipo-liga--sin-ficha { cursor: default; }
:global(body.tema-publico-azul) .tarjeta-equipo-liga { border-color: #294563; background: #102b47; color: #f1f6ff; }
:global(body.tema-publico-azul) .imagen-jugador-equipo::after { background: linear-gradient(90deg, #102b47 0%, rgb(16 43 71 / 88%) 16%, rgb(16 43 71 / 48%) 44%, rgb(16 43 71 / 8%) 100%), linear-gradient(0deg, rgb(2 14 29 / 35%) 0%, transparent 60%); }
:global(body.tema-publico-azul) .contenido-equipo-liga > strong { color: #fff; }
:global(body.tema-publico-azul) .nombre-figura-equipo { color: #c4d7e8; }
:global(body.tema-publico-azul) .escudo-equipo-liga { border-color: #294563; background: #fff; }
@media (prefers-reduced-motion: reduce) { .tarjeta-equipo-liga { transition: none; } }
</style>
