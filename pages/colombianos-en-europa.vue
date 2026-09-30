<script setup lang="ts">
import { ArrowUpRight, Clock3 } from '@lucide/vue'
import { useAnaliticaPublica } from '~/composables/useAnaliticaPublica'
import type { RespuestaColombianosEuropa, PartidoColombianoEuropa } from '~/types/colombianosEuropa'
import type { EstadoPartido, RespuestaResultados } from '~/types/resultados'
import { cruzarJugadoresConPartidos, formatearResultadoClubRival } from '~/utils/colombianosEuropa'
import { construirRutaPartido } from '~/utils/rutasPartidos'
import { construirUrlAbsoluta } from '~/utils/seo'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

const configuracion = useRuntimeConfig()
const analitica = useAnaliticaPublica()
const { data: respuestaColombianos, error: errorColombianos, refresh: actualizarColombianos } = await useFetch<RespuestaColombianosEuropa>(
  '/api/colombianos-europa',
  { key: 'colombianos-europa' }
)
const { data: respuestaResultados, error: errorResultados, refresh: actualizarResultados } = await useFetch<RespuestaResultados>(
  '/api/resultados',
  {
    key: 'colombianos-europa-partidos',
    query: { deporte: 'futbol', timeZone: zonaHorariaColombia }
  }
)

const jugadores = computed(() => respuestaColombianos.value?.jugadores || [])
const fechaConsultaColombia = computed(() => {
  const actualizadoEnResultados = respuestaResultados.value?.actualizadoEn
  const fechaReferencia = actualizadoEnResultados && Number.isFinite(Date.parse(actualizadoEnResultados))
    ? new Date(actualizadoEnResultados)
    : new Date()
  return obtenerFechaEnZonaHoraria(fechaReferencia, zonaHorariaColombia)
})
const partidosRelacionados = computed(() => cruzarJugadoresConPartidos(
  jugadores.value,
  respuestaResultados.value?.partidos || [],
  fechaConsultaColombia.value
))
const secciones: Array<{ estado: EstadoPartido, titulo: string, descripcion: string }> = [
  { estado: 'en-vivo', titulo: 'Juegan hoy', descripcion: 'Clubes colombianos en Europa con partidos en juego.' },
  { estado: 'finalizado', titulo: 'Resultados', descripcion: 'Marcadores de partidos ya finalizados.' },
  { estado: 'programado', titulo: 'Próximos', descripcion: 'Partidos que empiezan más tarde hoy.' }
]
const actualizadoEn = computed(() => [
  respuestaColombianos.value?.actualizadoEn,
  respuestaResultados.value?.actualizadoEn
].filter((valor): valor is string => Boolean(valor) && Number.isFinite(Date.parse(valor!)))
  .sort((a, b) => Date.parse(b) - Date.parse(a))[0])
const fechaActualizacion = computed(() => formatearFechaActualizacion(actualizadoEn.value))

function partidosPorEstado(estado: EstadoPartido): PartidoColombianoEuropa[] {
  return partidosRelacionados.value.filter(evento => evento.partido.estado === estado)
}

function formatearFechaActualizacion(valor: string | undefined): string {
  if (!valor || !Number.isFinite(Date.parse(valor))) return 'No disponible'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zonaHorariaColombia
  }).format(new Date(valor)).replace(/\u00a0/g, ' ')
}

async function reintentar() {
  await Promise.all([actualizarColombianos(), actualizarResultados()])
}

function registrarClicPartido() {
  void analitica.registrarEvento('colombian_match_click')
}

onMounted(() => {
  void analitica.registrarEvento('colombians_hub_view')
})

useSeoPont3la10(() => ({
  titulo: 'Colombianos en Europa hoy: partidos y resultados | Pont3la10',
  descripcion: 'Consulta partidos, clubes, rivales, horarios de Colombia y resultados de futbolistas colombianos en Europa.',
  rutaCanonica: '/colombianos-en-europa',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Colombianos en Europa', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa') }
      ]
    }, {
      '@type': 'CollectionPage',
      name: 'Colombianos en Europa',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: partidosRelacionados.value.map((evento, posicion) => ({
          '@type': 'ListItem',
          position: posicion + 1,
          name: `${evento.jugador.nombre} — ${evento.jugador.club} vs ${evento.rival}`,
          url: construirUrlAbsoluta(String(configuracion.public.siteUrl), construirRutaPartido(evento.partido))
        }))
      }
    }]
  }
}))
</script>

<template>
  <div class="pagina-resultados pagina-publica-medio pagina-seo-resultados pagina-colombianos-europa">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Colombianos en Europa' }]" />
    <header class="cabecera-resultados">
      <div>
        <p>Agenda de fútbol colombiano</p>
        <h1>Colombianos en Europa</h1>
        <span>Partidos de sus clubes hoy, con horarios de Colombia y resultados disponibles.</span>
      </div>
    </header>

    <nav class="enlaces-seo-resultados" aria-label="Más resultados deportivos">
      <NuxtLink to="/partidos-hoy">Todos los partidos de hoy <ArrowUpRight aria-hidden="true" /></NuxtLink>
      <p><Clock3 aria-hidden="true" /> Actualización consultada: {{ fechaActualizacion }} (hora Colombia)</p>
    </nav>

    <EstadoDatosResultados
      v-if="errorColombianos || errorResultados"
      titulo="No fue posible actualizar el hub"
      descripcion="Intenta de nuevo o consulta todos los partidos de hoy."
      :permitir-reintento="true"
      @reintentar="reintentar"
    />
    <EstadoDatosResultados
      v-else-if="!respuestaColombianos?.disponible"
      titulo="Listado verificado temporalmente no disponible"
      descripcion="Aún no se pudo consultar el registro público con nacionalidad verificada y clubes aprobados. No se inventan cruces por coincidencia de nombres."
    />
    <EstadoDatosResultados
      v-else-if="!partidosRelacionados.length"
      titulo="No encontramos partidos verificados para hoy"
      descripcion="Mostramos solo jugadores con fuente y fecha de nacionalidad verificadas y club europeo aprobado, vinculados al partido por identidad interna exacta. Consulta todos los partidos o vuelve más tarde."
    />
    <div v-else class="secciones-colombianos-europa">
      <section
        v-for="seccion in secciones"
        :key="seccion.estado"
        class="seccion-lista-resultados"
        :aria-labelledby="`colombianos-${seccion.estado}`"
      >
        <div class="titulo-panel-resultados">
          <div>
            <h2 :id="`colombianos-${seccion.estado}`">{{ seccion.titulo }}</h2>
            <span>{{ seccion.descripcion }}</span>
          </div>
          <span>{{ partidosPorEstado(seccion.estado).length }}</span>
        </div>
        <div v-if="partidosPorEstado(seccion.estado).length" class="grilla-colombianos-europa">
          <article
            v-for="evento in partidosPorEstado(seccion.estado)"
            :key="`${evento.jugador.slug}-${evento.partido.id}`"
            class="tarjeta-colombiano-europa"
          >
            <div class="tarjeta-colombiano-europa__jugador">
              <span>Jugador</span>
              <h3>{{ evento.jugador.nombre }}</h3>
              <p>{{ evento.jugador.club }}</p>
            </div>
            <dl class="tarjeta-colombiano-europa__partido">
              <div><dt>Rival</dt><dd>{{ evento.rival }}</dd></div>
              <div><dt>Competición</dt><dd>{{ evento.partido.competencia }}</dd></div>
              <div><dt>Hora Colombia</dt><dd><time :datetime="evento.partido.fechaIso">{{ evento.horaColombia }}</time></dd></div>
              <div><dt>Estado</dt><dd>{{ evento.partido.estado === 'en-vivo' ? 'En vivo' : evento.partido.estado === 'finalizado' ? 'Finalizado' : 'Próximo' }}</dd></div>
              <div v-if="evento.partido.estado !== 'programado' && formatearResultadoClubRival(evento)">
                <dt>Resultado club–rival</dt>
                <dd>{{ formatearResultadoClubRival(evento) }}</dd>
              </div>
            </dl>
            <p class="aviso-titularidad-colombiano">Partido del club; titularidad individual no confirmada.</p>
            <NuxtLink class="enlace-partido-colombiano" :to="construirRutaPartido(evento.partido)" @click="registrarClicPartido">
              Ver partido <ArrowUpRight aria-hidden="true" />
            </NuxtLink>
          </article>
        </div>
        <p v-else class="estado-vacio-resultados">No hay partidos en esta categoría.</p>
      </section>
    </div>
  </div>
</template>
