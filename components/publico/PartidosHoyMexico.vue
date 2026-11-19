<script setup lang="ts">
import { respuestaLigaMxVacia, type PartidoLigaMx, type RespuestaLigaMx } from '~/types/ligaMx'
import { estaEnJuego, estaFinalizado, proximosYRecientes } from '~/utils/ligaMxVista'

const { sitio } = useSitio()
const instante = useState('partidos-hoy-mx-instante', () => new Date().toISOString())
const { data, refresh } = await useFetch<RespuestaLigaMx>('/api/liga-mx', {
  key: 'partidos-hoy-mx', default: () => respuestaLigaMxVacia, ignoreResponseError: true
})

let intervalo: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  intervalo = setInterval(() => {
    instante.value = new Date().toISOString()
    void refresh()
  }, 60_000)
})
onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
})

const fechaHoy = computed(() => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: sitio.value.zonaHoraria
}).format(new Date(instante.value)))
const fechaLarga = computed(() => new Intl.DateTimeFormat(sitio.value.locale, {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: sitio.value.zonaHoraria
}).format(new Date(instante.value)))

const datos = computed(() => data.value || respuestaLigaMxVacia)
const hoy = computed(() => datos.value.partidos.filter(partido => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: sitio.value.zonaHoraria
}).format(new Date(partido.fechaIso)) === fechaHoy.value))
const enVivo = computed(() => hoy.value.filter(estaEnJuego))
const proximos = computed(() => hoy.value.filter(partido => !estaEnJuego(partido) && !estaFinalizado(partido)))
const finalizados = computed(() => hoy.value.filter(estaFinalizado))
const siguientes = computed(() => proximosYRecientes(datos.value.partidos as PartidoLigaMx[], Date.parse(instante.value), 6).proximos)

useSeoPont3la10({
  titulo: 'Partidos de hoy de la Liga MX: horarios y resultados | Pont3la10 México',
  descripcion: 'Consulta los partidos de hoy de la Liga MX y la Liga MX Femenil: horarios de Ciudad de México, marcadores y resultados.',
  rutaCanonica: '/partidos-hoy'
})
</script>

<template>
  <main class="pagina-partidos-hoy-mx">
    <div class="contenedor-partidos-hoy-mx">
      <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Partidos de hoy' }]" />
      <header>
        <p class="antetitulo-partidos-hoy-mx">AGENDA DE FÚTBOL</p>
        <h1>Partidos de hoy de la Liga MX</h1>
        <p class="fecha-partidos-hoy-mx">{{ fechaLarga }} · horarios de Ciudad de México</p>
      </header>

      <p v-if="datos.estado !== 'disponible'" class="aviso-partidos-hoy-mx">Estamos verificando los datos de la Liga MX. Vuelve pronto para ver la agenda del día.</p>

      <template v-else>
        <PublicoListaPartidosMx v-if="enVivo.length" :partidos="enVivo" titulo="En vivo" mostrar-liga />
        <PublicoListaPartidosMx v-if="proximos.length" :partidos="proximos" titulo="Próximos hoy" mostrar-liga />
        <PublicoListaPartidosMx v-if="finalizados.length" :partidos="finalizados" titulo="Finalizados hoy" mostrar-liga />
        <section v-if="!hoy.length" class="sin-partidos-mx" aria-label="Sin partidos hoy">
          <p class="aviso-partidos-hoy-mx">Hoy no hay partidos de la Liga MX ni de la Liga MX Femenil. Estos son los siguientes:</p>
          <PublicoListaPartidosMx :partidos="siguientes" titulo="Próximos partidos" mostrar-liga />
        </section>
        <p class="enlace-liga-mx"><NuxtLink to="/liga-mx">Tabla y calendario completos de la Liga MX <span aria-hidden="true">→</span></NuxtLink></p>
      </template>
    </div>
  </main>
</template>

<style scoped>
.pagina-partidos-hoy-mx { min-height: 60vh; background: #07182f; color: #f5f8ff; padding: 20px 0 48px; }
.contenedor-partidos-hoy-mx { display: grid; gap: 22px; width: min(900px, calc(100% - 48px)); margin: 0 auto; }
.antetitulo-partidos-hoy-mx { margin: 0; color: #ffd800; font-size: .7rem; font-weight: 800; letter-spacing: .1em; }
.contenedor-partidos-hoy-mx h1 { margin: 6px 0 8px; color: #f5f8ff; font-size: clamp(1.7rem, 3vw, 2.4rem); font-weight: 850; letter-spacing: -.04em; }
.fecha-partidos-hoy-mx { margin: 0; color: #a8bbd5; }
.fecha-partidos-hoy-mx::first-letter { text-transform: uppercase; }
.aviso-partidos-hoy-mx { margin: 0 0 12px; padding: 14px; border-radius: 8px; background: rgba(255, 255, 255, .06); color: #cbd8ee; line-height: 1.5; }
.enlace-liga-mx a { color: #ffd800; font-weight: 750; text-decoration: none; }
.pagina-partidos-hoy-mx :focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 640px) { .contenedor-partidos-hoy-mx { width: calc(100% - 32px); } }
</style>
