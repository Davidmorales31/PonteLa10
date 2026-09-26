<script setup lang="ts">
import { ArrowUpRight, Clock3 } from '@lucide/vue'
import type { EstadoPartido, RespuestaResultados } from '~/types/resultados'
import { construirUrlAbsoluta } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const zonaHoraria = ref('America/Bogota')
const { data: respuesta, error, refresh } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'seo-partidos-hoy',
  query: computed(() => ({ timeZone: zonaHoraria.value }))
})

const fechaLocal = computed(() => new Intl.DateTimeFormat('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: zonaHoraria.value
}).format(new Date()))
const nombreZonaHoraria = computed(() => new Intl.DateTimeFormat('es-CO', {
  timeZone: zonaHoraria.value,
  timeZoneName: 'longGeneric'
}).formatToParts(new Date()).find(parte => parte.type === 'timeZoneName')?.value || 'tu hora local')
const grupos: Array<{ id: EstadoPartido, titulo: string, descripcion: string }> = [
  { id: 'en-vivo', titulo: 'En vivo', descripcion: 'Partidos que se están jugando ahora.' },
  { id: 'programado', titulo: 'Próximos', descripcion: 'Encuentros pendientes de la jornada.' },
  { id: 'finalizado', titulo: 'Finalizados', descripcion: 'Marcadores confirmados de hoy.' }
]
const partidosPorEstado = (estado: EstadoPartido) => computed(() =>
  (respuesta.value?.partidos || []).filter(partido => partido.estado === estado)
)
const partidos = computed(() => respuesta.value?.partidos || [])

onMounted(() => {
  const zonaDetectada = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (zonaDetectada) zonaHoraria.value = zonaDetectada
})

useSeoPont3la10(() => ({
  titulo: 'Partidos de hoy: horarios, resultados y fútbol en vivo | Pont3la10',
  descripcion: 'Consulta los partidos de hoy con horarios adaptados a tu zona horaria, marcadores y resultados de fútbol y otros deportes.',
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
  <main class="pagina-resultados pagina-publica-medio pagina-seo-resultados">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Partidos de hoy' }]" />
    <header class="cabecera-resultados">
      <div>
        <p>Agenda deportiva</p>
        <h1>Partidos de hoy, {{ fechaLocal }}</h1>
        <div class="referencia-horaria-local">
          <span><Clock3 aria-hidden="true" /> Horarios en la hora de tu dispositivo</span>
          <span>{{ nombreZonaHoraria }}</span>
        </div>
      </div>
    </header>
    <nav class="enlaces-seo-resultados" aria-labelledby="titulo-explorar-resultados">
      <h2 id="titulo-explorar-resultados">Explora los marcadores</h2>
      <div>
        <NuxtLink to="/resultados/en-vivo">En vivo <ArrowUpRight aria-hidden="true" /></NuxtLink>
        <NuxtLink to="/resultados/futbol">Fútbol <ArrowUpRight aria-hidden="true" /></NuxtLink>
        <NuxtLink to="/resultados">Todos los deportes <ArrowUpRight aria-hidden="true" /></NuxtLink>
      </div>
    </nav>
    <EstadoDatosResultados v-if="error" descripcion="No fue posible consultar los partidos de hoy. Intenta actualizar la jornada." :permitir-reintento="true" @reintentar="refresh" />
    <EstadoDatosResultados v-else-if="!partidos.length" descripcion="No hay partidos disponibles para hoy. Consulta los resultados en vivo o vuelve más tarde." />
    <template v-else>
      <section v-for="grupo in grupos" :key="grupo.id" class="seccion-lista-resultados" :aria-labelledby="`partidos-${grupo.id}`">
      <div class="titulo-panel-resultados"><div><h2 :id="`partidos-${grupo.id}`">{{ grupo.titulo }}</h2></div><span>{{ grupo.descripcion }}</span></div>
      <div v-if="partidosPorEstado(grupo.id).value.length" class="grilla-marcadores-resultados">
        <TarjetaMarcadorCompacto v-for="partido in partidosPorEstado(grupo.id).value" :key="partido.id" :partido="partido" :zona-horaria="zonaHoraria" />
      </div>
      <p v-else class="estado-vacio-resultados">No hay partidos {{ grupo.titulo.toLocaleLowerCase('es-CO') }} en este momento.</p>
      </section>
    </template>
  </main>
</template>
