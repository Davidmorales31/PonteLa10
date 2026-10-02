<script setup lang="ts">
import { ArrowUpRight, Clock3 } from '@lucide/vue'
import type { EstadoPartido, RespuestaResultados } from '~/types/resultados'
import { construirUrlAbsoluta } from '~/utils/seo'
import { clasificarCategoriaFutbol, type CategoriaFutbol } from '~/utils/clasificacionFutbol'

const configuracion = useRuntimeConfig()
const zonaHoraria = ref('America/Bogota')
// Se serializa para que servidor y cliente formateen el mismo instante durante
// la hidratación, incluso si el render cruza la medianoche de Bogotá.
const instanteRenderizado = useState('partidos-hoy-instante-renderizado', () => new Date().toISOString())
const { data: respuesta, error, refresh } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'seo-partidos-hoy',
  query: computed(() => ({ deporte: 'futbol', timeZone: zonaHoraria.value }))
})

const fechaLocal = computed(() => new Intl.DateTimeFormat('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: zonaHoraria.value
}).format(new Date(instanteRenderizado.value)))
const nombreZonaHoraria = computed(() => new Intl.DateTimeFormat('es-CO', {
  timeZone: zonaHoraria.value,
  timeZoneName: 'longGeneric'
}).formatToParts(new Date(instanteRenderizado.value)).find(parte => parte.type === 'timeZoneName')?.value || 'tu hora local')
const grupos: Array<{ id: EstadoPartido, titulo: string, descripcion: string }> = [
  { id: 'en-vivo', titulo: 'En vivo', descripcion: 'Partidos que se están jugando ahora.' },
  { id: 'programado', titulo: 'Próximos', descripcion: 'Encuentros pendientes de la jornada.' },
  { id: 'finalizado', titulo: 'Finalizados', descripcion: 'Marcadores confirmados de hoy.' }
]
const partidos = computed(() => respuesta.value?.partidos || [])
const filtroSeleccionado = ref<'todos' | 'en-vivo' | CategoriaFutbol>('todos')

function clasificarPartido(partido: RespuestaResultados['partidos'][number]): CategoriaFutbol {
  return clasificarCategoriaFutbol({
    competencia: partido.competencia,
    paisCompetencia: partido.paisCompetencia,
    equipoLocal: partido.equipoLocal.nombre,
    equipoVisitante: partido.equipoVisitante.nombre
  })
}

const opcionesFiltro = computed(() => [
  { id: 'todos' as const, titulo: 'Todos', cantidad: partidos.value.length },
  { id: 'en-vivo' as const, titulo: 'En vivo', cantidad: partidos.value.filter(partido => partido.estado === 'en-vivo').length },
  { id: 'colombia' as const, titulo: 'Colombia', cantidad: partidos.value.filter(partido => clasificarPartido(partido) === 'colombia').length },
  { id: 'europa' as const, titulo: 'Europa', cantidad: partidos.value.filter(partido => clasificarPartido(partido) === 'europa').length },
  { id: 'cinco-grandes' as const, titulo: 'Cinco grandes', cantidad: partidos.value.filter(partido => clasificarPartido(partido) === 'cinco-grandes').length }
])
const partidosFiltrados = computed(() => partidos.value.filter(partido => {
  if (filtroSeleccionado.value === 'todos') return true
  if (filtroSeleccionado.value === 'en-vivo') return partido.estado === 'en-vivo'
  return clasificarPartido(partido) === filtroSeleccionado.value
}).sort((primero, segundo) => Date.parse(primero.fechaIso) - Date.parse(segundo.fechaIso)))
const gruposVisibles = computed(() => grupos.flatMap(grupo => {
  const encuentros = partidosFiltrados.value.filter(partido => partido.estado === grupo.id)
  return encuentros.length ? [{ ...grupo, partidos: encuentros }] : []
}))
const primerGrupoConPartidos = computed(() => gruposVisibles.value[0]?.id || null)
const cantidadEnVivo = computed(() => partidos.value.filter(partido => partido.estado === 'en-vivo').length)

onMounted(() => {
  instanteRenderizado.value = new Date().toISOString()
  const zonaDetectada = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (zonaDetectada) zonaHoraria.value = zonaDetectada
})

useSeoPont3la10(() => ({
  titulo: 'Partidos de hoy: horarios, resultados y fútbol en vivo | Pont3la10',
  descripcion: 'Consulta los partidos de fútbol de hoy: horarios locales, marcadores en vivo, encuentros colombianos y competiciones europeas.',
  rutaCanonica: '/partidos-hoy',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Partidos de hoy', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/partidos-hoy') }
      ]
    }, {
      '@type': 'CollectionPage',
      name: 'Partidos de hoy',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: partidos.value.map((partido, posicion) => ({
          '@type': 'ListItem', position: posicion + 1,
          name: `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}`,
          url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/resultados/${partido.id}`)
        }))
      }
    }]
  }
}))
</script>

<template>
  <main class="pagina-resultados pagina-publica-medio pagina-seo-resultados pagina-agenda-futbol">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Partidos de hoy' }]" />
    <header class="cabecera-resultados encabezado-agenda-futbol">
      <div>
        <p>Agenda de fútbol</p>
        <h1>Partidos de fútbol hoy</h1>
        <span class="fecha-agenda-futbol">{{ fechaLocal }} · marcadores y horarios de la jornada</span>
        <div class="referencia-horaria-local">
          <span><Clock3 aria-hidden="true" /> Horarios en la hora de tu dispositivo</span>
        <span>{{ nombreZonaHoraria }}</span>
        </div>
      </div>
      <div v-if="cantidadEnVivo" class="resumen-en-vivo-agenda" aria-live="polite">
        <span class="pulso-en-vivo" aria-hidden="true" />
        <strong>{{ cantidadEnVivo }} {{ cantidadEnVivo === 1 ? 'partido en vivo' : 'partidos en vivo' }}</strong>
      </div>
    </header>
    <nav class="filtros-agenda-futbol" aria-label="Filtrar partidos de fútbol de hoy">
      <button
        v-for="opcion in opcionesFiltro"
        :key="opcion.id"
        type="button"
        :class="{ activo: filtroSeleccionado === opcion.id }"
        :aria-pressed="filtroSeleccionado === opcion.id"
        @click="filtroSeleccionado = opcion.id"
      >{{ opcion.titulo }} <span>{{ opcion.cantidad }}</span></button>
    </nav>
    <nav class="enlaces-seo-resultados enlaces-agenda-futbol" aria-labelledby="titulo-explorar-resultados">
      <h2 id="titulo-explorar-resultados">Más resultados</h2>
      <div>
        <NuxtLink to="/resultados/en-vivo">En vivo <ArrowUpRight aria-hidden="true" /></NuxtLink>
        <NuxtLink to="/resultados">Todos los deportes <ArrowUpRight aria-hidden="true" /></NuxtLink>
      </div>
    </nav>
    <EstadoDatosResultados v-if="error" descripcion="No fue posible consultar los partidos de hoy. Intenta actualizar la jornada." :permitir-reintento="true" @reintentar="refresh" />
    <div v-else-if="!partidos.length" class="vacio-agenda-futbol">
      <h2>Hoy no hay partidos disponibles</h2>
      <p>Vuelve más tarde o consulta todos los resultados deportivos.</p>
      <NuxtLink to="/resultados">Ver resultados <ArrowUpRight aria-hidden="true" /></NuxtLink>
    </div>
    <div v-else-if="!partidosFiltrados.length" class="vacio-agenda-futbol vacio-filtro-agenda">
      <h2>No encontramos partidos en este filtro</h2>
      <p>Prueba otra categoría para ver la jornada completa.</p>
      <button type="button" @click="filtroSeleccionado = 'todos'">Mostrar todos los partidos</button>
    </div>
    <template v-else>
      <section v-for="grupo in gruposVisibles" :key="grupo.id" class="seccion-lista-resultados seccion-agenda-futbol" :aria-labelledby="`partidos-${grupo.id}`">
        <div class="titulo-panel-resultados titulo-agenda-futbol">
          <div><h2 :id="`partidos-${grupo.id}`">{{ grupo.titulo }}</h2><span class="cantidad-agenda">{{ grupo.partidos.length }}</span></div>
          <span>{{ grupo.descripcion }}</span>
        </div>
        <div class="grilla-marcadores-resultados">
          <template v-for="(partido, indice) in grupo.partidos" :key="partido.id">
            <TarjetaMarcadorCompacto :partido="partido" :zona-horaria="zonaHoraria" />
            <div
              v-if="grupo.id === primerGrupoConPartidos && indice === 2"
              class="publicidad-en-linea-resultados"
              style="grid-column: 1 / -1"
            >
              <PublicidadAdsterraSlot formato="leaderboard" contexto="partidos de hoy" />
            </div>
          </template>
        </div>
        <PublicidadAdsterraSlot
          v-if="grupo.id === primerGrupoConPartidos && grupo.partidos.length < 3"
          formato="leaderboard"
          contexto="partidos de hoy"
        />
      </section>
    </template>
  </main>
</template>

<style scoped>
.pagina-agenda-futbol { padding-top: 18px; }
.encabezado-agenda-futbol { align-items: end; margin: 18px 0 20px; }
.encabezado-agenda-futbol h1 { margin: 0; letter-spacing: -.045em; }
.encabezado-agenda-futbol .fecha-agenda-futbol { color: var(--muted); font-size: .9rem; }
.resumen-en-vivo-agenda { display: inline-flex; align-items: center; gap: 10px; border: 1px solid #ffd8dc; border-radius: 999px; background: #fff5f6; padding: 11px 16px; color: #a91323; font-size: .8rem; }
.pulso-en-vivo { width: 9px; height: 9px; border-radius: 50%; background: #d71321; box-shadow: 0 0 0 5px #f9dce0; }
.filtros-agenda-futbol { display: flex; gap: 8px; overflow-x: auto; margin: 0 0 12px; padding: 2px 0 7px; scrollbar-width: thin; }
.filtros-agenda-futbol button { display: inline-flex; min-height: 43px; flex: 0 0 auto; align-items: center; gap: 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface, #fff); padding: 0 15px; color: var(--text, #173454); font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
.filtros-agenda-futbol button span, .cantidad-agenda { display: inline-grid; min-width: 22px; height: 22px; place-items: center; border-radius: 99px; background: rgba(27, 86, 140, .1); padding: 0 5px; font-size: .68rem; }
.filtros-agenda-futbol button.activo { border-color: #143e70; background: #143e70; color: #fff; }
.filtros-agenda-futbol button.activo span { background: rgba(255,255,255,.18); }
.filtros-agenda-futbol button:focus-visible, .vacio-agenda-futbol a:focus-visible, .vacio-agenda-futbol button:focus-visible { outline: 3px solid #e7b900; outline-offset: 3px; }
.enlaces-agenda-futbol { margin-bottom: 18px; }
.seccion-agenda-futbol { margin-top: 14px; }
.titulo-agenda-futbol > div { display: flex; align-items: center; gap: 9px; }
.titulo-agenda-futbol h2 { margin: 0; }
.cantidad-agenda { background: #edf4fb; color: #315575; }
.vacio-agenda-futbol { display: grid; justify-items: start; gap: 8px; margin: 18px 0; border: 1px solid var(--line); border-radius: 16px; background: var(--surface, #fff); padding: 24px; }
.vacio-agenda-futbol h2 { margin: 0; font-size: 1rem; }
.vacio-agenda-futbol p { margin: 0; color: var(--muted); font-size: .85rem; }
.vacio-agenda-futbol a, .vacio-agenda-futbol button { display: inline-flex; min-height: 38px; align-items: center; gap: 7px; margin-top: 5px; border: 0; border-radius: 9px; background: #143e70; padding: 0 13px; color: #fff; font: inherit; font-size: .78rem; font-weight: 800; text-decoration: none; cursor: pointer; }
.vacio-agenda-futbol a svg { width: 14px; }
.vacio-filtro-agenda { padding: 17px 20px; }
@media (max-width: 680px) {
  .encabezado-agenda-futbol { align-items: flex-start; }
  .resumen-en-vivo-agenda { padding: 9px 13px; }
  .titulo-agenda-futbol { align-items: flex-start; flex-direction: column; }
  .titulo-agenda-futbol > span { line-height: 1.45; }
  .seccion-agenda-futbol { padding: 14px; }
}
</style>
