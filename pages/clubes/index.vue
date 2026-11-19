<script setup lang="ts">
import { respuestaLigaMxVacia, type RespuestaLigaMx } from '~/types/ligaMx'
import { clubesDeLigaMx, torneoActual } from '~/utils/ligaMxVista'

const { data } = await useFetch<RespuestaLigaMx>('/api/liga-mx', { key: 'liga-mx-clubes', default: () => respuestaLigaMxVacia, ignoreResponseError: true })
const datos = computed(() => data.value || respuestaLigaMxVacia)
const ahora = Date.now()
const clubes = computed(() => clubesDeLigaMx(datos.value.tabla, datos.value.partidos, torneoActual(datos.value.partidos, datos.value.tabla, ahora)))

useSeoPont3la10({
  titulo: 'Clubes de la Liga MX: posiciones, calendario y noticias | Pont3la10 México',
  descripcion: 'Los clubes de la Liga MX con su posición en la tabla, próximos partidos y últimas noticias.',
  rutaCanonica: '/clubes',
  seccion: 'LIGA MX'
})
</script>

<template>
  <div class="pagina-clubes-mx">
    <div class="contenedor-clubes-mx">
      <p class="antetitulo-clubes-mx">LIGA MX</p>
      <h1>Clubes de la Liga MX</h1>
      <p class="intro-clubes-mx">Posición actual, calendario y noticias de cada club.</p>
      <ul v-if="clubes.length" class="rejilla-clubes-mx">
        <li v-for="club in clubes" :key="club.clave">
          <NuxtLink :to="`/clubes/${club.clave}`">
            <b aria-hidden="true">{{ club.nombre.slice(0, 1) }}</b>
            <span>
              <strong>{{ club.nombre }}</strong>
              <small v-if="club.posicion">#{{ club.posicion }} · {{ club.puntos }} pts · {{ club.jugados }} PJ</small>
            </span>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="aviso-clubes-mx">Estamos verificando los datos de los clubes. Vuelve pronto.</p>
    </div>
  </div>
</template>

<style scoped>
.pagina-clubes-mx { min-height: 60vh; background: #07182f; color: #f5f8ff; padding: 24px 0 48px; }
.contenedor-clubes-mx { width: min(1100px, calc(100% - 48px)); margin: 0 auto; }
.antetitulo-clubes-mx { margin: 0; color: #ffd800; font-size: .7rem; font-weight: 800; letter-spacing: .1em; }
.contenedor-clubes-mx h1 { margin: 6px 0 10px; color: #f5f8ff; font-size: clamp(1.7rem, 3vw, 2.5rem); font-weight: 850; letter-spacing: -.04em; }
.intro-clubes-mx { margin: 0 0 22px; color: #a8bbd5; }
.rejilla-clubes-mx { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.rejilla-clubes-mx a { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid rgba(255, 255, 255, .14); border-radius: 8px; background: rgba(255, 255, 255, .05); color: inherit; text-decoration: none; }
.rejilla-clubes-mx a:hover { border-color: #ffd800; }
.rejilla-clubes-mx b { display: grid; flex: none; width: 40px; height: 40px; place-items: center; border-radius: 50%; background: #174ea6; color: #fff; }
.rejilla-clubes-mx strong { display: block; font-weight: 800; }
.rejilla-clubes-mx small { color: #9eafc8; }
.aviso-clubes-mx { padding: 16px; border-radius: 8px; background: rgba(255, 255, 255, .06); color: #cbd8ee; }
.pagina-clubes-mx :focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 640px) { .contenedor-clubes-mx { width: calc(100% - 32px); } }
</style>
