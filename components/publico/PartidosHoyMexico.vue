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
  titulo: 'Partidos de hoy de la Liga MX: horarios y resultados | Ponte la 10 México',
  descripcion: 'Consulta los partidos de hoy de la Liga MX y la Liga MX Femenil: horarios de Ciudad de México, marcadores y resultados.',
  rutaCanonica: '/partidos-hoy'
})
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio pagina-partidos-hoy-mx">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Partidos de hoy' }]" />
    <header class="cabecera-pagina cabecera-noticias-medio">
      <p class="etiqueta-seccion">AGENDA DE FÚTBOL</p>
      <h1>Partidos de hoy de la Liga MX</h1>
      <p class="fecha-partidos-hoy-mx">{{ fechaLarga }} · horarios de Ciudad de México</p>
    </header>

    <p v-if="datos.estado !== 'disponible'" class="aviso-partidos-hoy-mx">Estamos verificando los datos de la Liga MX. Vuelve pronto para ver la agenda del día.</p>

    <div v-else class="listas-partidos-hoy-mx">
      <div v-if="enVivo.length" class="panel-partidos-hoy-mx"><PublicoListaPartidosMx :partidos="enVivo" titulo="En vivo" mostrar-liga /></div>
      <div v-if="proximos.length" class="panel-partidos-hoy-mx"><PublicoListaPartidosMx :partidos="proximos" titulo="Próximos hoy" mostrar-liga /></div>
      <div v-if="finalizados.length" class="panel-partidos-hoy-mx"><PublicoListaPartidosMx :partidos="finalizados" titulo="Finalizados hoy" mostrar-liga /></div>
      <section v-if="!hoy.length" class="panel-partidos-hoy-mx" aria-label="Sin partidos hoy">
        <p class="aviso-partidos-hoy-mx">Hoy no hay partidos de la Liga MX ni de la Liga MX Femenil. Estos son los siguientes:</p>
        <PublicoListaPartidosMx :partidos="siguientes" titulo="Próximos partidos" mostrar-liga />
      </section>
      <p class="enlace-liga-mx"><NuxtLink to="/liga-mx">Tabla y calendario completos de la Liga MX <span aria-hidden="true">→</span></NuxtLink></p>
    </div>
  </main>
</template>

<style scoped>
.fecha-partidos-hoy-mx::first-letter { text-transform: uppercase; }
.listas-partidos-hoy-mx { display: grid; gap: 16px; max-width: 900px; margin-top: 18px; }
.panel-partidos-hoy-mx { padding: 18px; border: 1px solid #dbe2ee; border-radius: 8px; background: #fff; box-shadow: 0 18px 46px rgba(8, 32, 74, .06); }
.aviso-partidos-hoy-mx { margin: 0 0 12px; padding: 14px; border: 1px solid #dbe2ee; border-radius: 8px; background: #f4f7fb; color: #45566e; line-height: 1.5; }
.enlace-liga-mx a { color: #145996; font-weight: 750; text-decoration: none; }
.pagina-partidos-hoy-mx :focus-visible { outline: 3px solid #145996; outline-offset: 3px; }
</style>
