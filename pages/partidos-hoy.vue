<script setup lang="ts">
import type { EstadoPartido, RespuestaResultados } from '~/types/resultados'
import { construirUrlAbsoluta } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const { data: respuesta, error, refresh } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'seo-partidos-hoy'
})

const fechaColombia = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota'
}).format(new Date())
const grupos: Array<{ id: EstadoPartido, titulo: string, descripcion: string }> = [
  { id: 'en-vivo', titulo: 'En vivo', descripcion: 'Partidos que se están jugando ahora.' },
  { id: 'programado', titulo: 'Próximos', descripcion: 'Encuentros pendientes de la jornada.' },
  { id: 'finalizado', titulo: 'Finalizados', descripcion: 'Marcadores confirmados de hoy.' }
]
const partidosPorEstado = (estado: EstadoPartido) => computed(() =>
  (respuesta.value?.partidos || []).filter(partido => partido.estado === estado)
)
const partidos = computed(() => respuesta.value?.partidos || [])

useSeoPont3la10(() => ({
  titulo: 'Partidos de hoy: horarios, resultados y fútbol en vivo | Pont3la10',
  descripcion: 'Consulta los partidos de hoy, horarios en Colombia, marcadores y resultados actualizados de fútbol y otros deportes.',
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
    <nav class="migas-seo" aria-label="Migas de pan"><NuxtLink to="/">Inicio</NuxtLink><span>/</span><span>Partidos de hoy</span></nav>
    <header class="cabecera-resultados">
      <div>
        <p>Agenda deportiva</p>
        <h1>Partidos de hoy, {{ fechaColombia }}</h1>
        <span>Horarios en Colombia, resultados y marcadores de los encuentros disponibles durante la jornada.</span>
      </div>
    </header>
    <nav class="enlaces-seo-resultados" aria-label="Explorar resultados">
      <NuxtLink to="/resultados/en-vivo">Resultados en vivo</NuxtLink>
      <NuxtLink to="/resultados/futbol">Resultados de fútbol</NuxtLink>
      <NuxtLink to="/resultados">Todos los marcadores</NuxtLink>
    </nav>
    <EstadoDatosResultados v-if="error" descripcion="No fue posible consultar los partidos de hoy. Intenta actualizar la jornada." :permitir-reintento="true" @reintentar="refresh" />
    <EstadoDatosResultados v-else-if="!partidos.length" descripcion="No hay partidos disponibles para hoy. Consulta los resultados en vivo o vuelve más tarde." />
    <template v-else>
      <section v-for="grupo in grupos" :key="grupo.id" class="seccion-lista-resultados" :aria-labelledby="`partidos-${grupo.id}`">
      <div class="titulo-panel-resultados"><div><h2 :id="`partidos-${grupo.id}`">{{ grupo.titulo }}</h2></div><span>{{ grupo.descripcion }}</span></div>
      <div v-if="partidosPorEstado(grupo.id).value.length" class="grilla-marcadores-resultados">
        <TarjetaMarcadorCompacto v-for="partido in partidosPorEstado(grupo.id).value" :key="partido.id" :partido="partido" />
      </div>
      <p v-else class="estado-vacio-resultados">No hay partidos {{ grupo.titulo.toLocaleLowerCase('es-CO') }} en este momento.</p>
      </section>
    </template>
  </main>
</template>
