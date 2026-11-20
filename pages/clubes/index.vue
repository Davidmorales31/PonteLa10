<script setup lang="ts">
import { respuestaLigaMxVacia, type RespuestaLigaMx } from '~/types/ligaMx'
import { clubesDeLigaMx, torneoActual } from '~/utils/ligaMxVista'

const { data } = await useFetch<RespuestaLigaMx>('/api/liga-mx', { key: 'liga-mx-clubes', default: () => respuestaLigaMxVacia, ignoreResponseError: true })
const datos = computed(() => data.value || respuestaLigaMxVacia)
// El instante se comparte entre servidor y navegador para que las listas hidraten igual.
const ahora = useState<number>('clubes-mx-ahora', () => Date.now()).value
const clubes = computed(() => clubesDeLigaMx(datos.value.tabla, datos.value.partidos, torneoActual(datos.value.partidos, datos.value.tabla, ahora)))

useSeoPont3la10({
  titulo: 'Clubes de la Liga MX: posiciones, calendario y noticias | Ponte la 10 México',
  descripcion: 'Los clubes de la Liga MX con su posición en la tabla, próximos partidos y últimas noticias.',
  rutaCanonica: '/clubes',
  seccion: 'LIGA MX'
})
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio pagina-clubes-mx">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Liga MX', ruta: '/liga-mx' }, { etiqueta: 'Clubes' }]" />
    <header class="cabecera-pagina cabecera-noticias-medio">
      <p class="etiqueta-seccion">LIGA MX</p>
      <h1>Clubes de la Liga MX</h1>
      <p>Posición actual, calendario y noticias de cada club.</p>
    </header>
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
  </main>
</template>

<style scoped>
.rejilla-clubes-mx { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin: 22px 0 0; padding: 0; list-style: none; }
.rejilla-clubes-mx a { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #dbe2ee; border-radius: 8px; background: #fff; color: #08204a; text-decoration: none; box-shadow: 0 18px 46px rgba(8, 32, 74, .06); }
.rejilla-clubes-mx a:hover { border-color: #145996; }
.rejilla-clubes-mx b { display: grid; flex: none; width: 40px; height: 40px; place-items: center; border-radius: 50%; background: #174ea6; color: #fff; }
.rejilla-clubes-mx strong { display: block; font-weight: 800; }
.rejilla-clubes-mx small { color: #5f6878; }
.aviso-clubes-mx { margin-top: 22px; padding: 16px; border: 1px solid #dbe2ee; border-radius: 8px; background: #f4f7fb; color: #45566e; }
.pagina-clubes-mx :focus-visible { outline: 3px solid #145996; outline-offset: 3px; }
</style>
