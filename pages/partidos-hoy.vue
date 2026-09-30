<script setup lang="ts">
import { ArrowUpRight, Clock3 } from '@lucide/vue'
import { useAnaliticaPublica } from '~/composables/useAnaliticaPublica'
import type { DeporteResultado, EstadoPartido, RespuestaResultados } from '~/types/resultados'
import {
  filtrarPartidosHoy,
  obtenerOpcionesCompetenciaFiltro,
  obtenerOpcionesEquipoFiltro,
  type FiltrosPartidosHoy
} from '~/utils/filtrosPartidosHoy'
import { seleccionarPartidoRespuestaDirecta } from '~/utils/resultadosDeportivos'
import { construirRutaPartido } from '~/utils/rutasPartidos'
import { construirUrlAbsoluta } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const zonaHoraria = ref('America/Bogota')
const analitica = useAnaliticaPublica()
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
const partidos = computed(() => respuesta.value?.partidos || [])
const opcionesDeporte: Array<{ valor: DeporteResultado, etiqueta: string }> = [
  { valor: 'futbol', etiqueta: 'Fútbol' },
  { valor: 'baloncesto', etiqueta: 'Baloncesto' },
  { valor: 'tenis', etiqueta: 'Tenis' },
  { valor: 'beisbol', etiqueta: 'Béisbol' }
]
const filtros = reactive<FiltrosPartidosHoy>({
  deporte: '',
  competencia: '',
  equipo: '',
  estado: '',
  soloDestacados: false
})
const opcionesCompetencia = computed(() => obtenerOpcionesCompetenciaFiltro(partidos.value))
const opcionesEquipo = computed(() => obtenerOpcionesEquipoFiltro(partidos.value))
const partidosFiltrados = computed(() => filtrarPartidosHoy(partidos.value, filtros))
const hayFiltrosActivos = computed(() => Boolean(
  filtros.deporte || filtros.competencia || filtros.equipo || filtros.estado || filtros.soloDestacados
))
const partidoRespuestaDirecta = computed(() => seleccionarPartidoRespuestaDirecta(partidosFiltrados.value))
const partidosPorEstado = (estado: EstadoPartido) => partidosFiltrados.value
  .filter(partido => partido.estado === estado)

function registrarCambioFiltro() {
  void analitica.registrarEvento('matches_today_filter')
}

function limpiarFiltros() {
  filtros.deporte = ''
  filtros.competencia = ''
  filtros.equipo = ''
  filtros.estado = ''
  filtros.soloDestacados = false
  registrarCambioFiltro()
}

onMounted(() => {
  const zonaDetectada = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (zonaDetectada) zonaHoraria.value = zonaDetectada
  void analitica.registrarEvento('matches_today_view')
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
          url: construirUrlAbsoluta(String(configuracion.public.siteUrl), construirRutaPartido(partido))
        }))
      }
    }]
  }
}))
</script>

<template>
  <div class="pagina-resultados pagina-publica-medio pagina-seo-resultados">
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
    <fieldset v-if="!error && partidos.length" class="filtros-partidos-hoy">
      <legend>Filtra los partidos de hoy</legend>
      <div class="controles-filtros-partidos-hoy">
        <label for="filtro-deporte-partidos-hoy">
          Deporte
          <select id="filtro-deporte-partidos-hoy" v-model="filtros.deporte" @change="registrarCambioFiltro">
            <option value="">Todos los deportes</option>
            <option v-for="opcion in opcionesDeporte" :key="opcion.valor" :value="opcion.valor">
              {{ opcion.etiqueta }}
            </option>
          </select>
        </label>
        <label for="filtro-competencia-partidos-hoy">
          Competición
          <select id="filtro-competencia-partidos-hoy" v-model="filtros.competencia" @change="registrarCambioFiltro">
            <option value="">Todas las competiciones</option>
            <option v-for="opcion in opcionesCompetencia" :key="opcion.valor" :value="opcion.valor">
              {{ opcion.etiqueta }}
            </option>
          </select>
        </label>
        <label for="filtro-equipo-partidos-hoy">
          Equipo
          <select id="filtro-equipo-partidos-hoy" v-model="filtros.equipo" @change="registrarCambioFiltro">
            <option value="">Todos los equipos</option>
            <option v-for="opcion in opcionesEquipo" :key="opcion.valor" :value="opcion.valor">
              {{ opcion.etiqueta }}
            </option>
          </select>
        </label>
        <label for="filtro-estado-partidos-hoy">
          Estado
          <select id="filtro-estado-partidos-hoy" v-model="filtros.estado" @change="registrarCambioFiltro">
            <option value="">Todos los estados</option>
            <option value="en-vivo">En vivo</option>
            <option value="programado">Próximos</option>
            <option value="finalizado">Finalizados</option>
          </select>
        </label>
        <label class="filtro-destacados-partidos-hoy" for="filtro-destacados-partidos-hoy">
          <input
            id="filtro-destacados-partidos-hoy"
            v-model="filtros.soloDestacados"
            type="checkbox"
            @change="registrarCambioFiltro"
          >
          Solo destacados
        </label>
        <button v-if="hayFiltrosActivos" class="boton-limpiar-filtros-partidos-hoy" type="button" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </div>
      <p class="resumen-filtros-partidos-hoy" aria-live="polite" aria-atomic="true">
        {{ partidosFiltrados.length }} {{ partidosFiltrados.length === 1 ? 'partido coincide' : 'partidos coinciden' }}
        con estos filtros.
      </p>
    </fieldset>
    <RespuestaDirectaDeportiva
      v-if="!error && partidoRespuestaDirecta"
      :partido="partidoRespuestaDirecta"
      :zona-horaria="zonaHoraria"
      titulo="Respuesta rápida de la jornada"
      :mostrar-enlace-detalle="true"
    />
    <EstadoDatosResultados v-if="error" descripcion="No fue posible consultar los partidos de hoy. Intenta actualizar la jornada." :permitir-reintento="true" @reintentar="refresh" />
    <EstadoDatosResultados v-else-if="!partidos.length" titulo="No hay partidos para hoy" descripcion="Consulta los resultados en vivo o vuelve más tarde; la jornada se actualiza automáticamente." />
    <div v-else-if="!partidosFiltrados.length" class="estado-vacio-resultados estado-vacio-filtro-partidos-hoy" role="status">
      <p>No hay partidos que coincidan con estos filtros.</p>
      <button type="button" @click="limpiarFiltros">Mostrar todos los partidos</button>
    </div>
    <template v-else>
      <section v-for="grupo in grupos" :key="grupo.id" class="seccion-lista-resultados" :aria-labelledby="`partidos-${grupo.id}`">
      <div class="titulo-panel-resultados"><div><h2 :id="`partidos-${grupo.id}`">{{ grupo.titulo }}</h2></div><span>{{ grupo.descripcion }}</span></div>
      <div v-if="partidosPorEstado(grupo.id).length" class="grilla-marcadores-resultados">
        <TarjetaMarcadorCompacto
          v-for="partido in partidosPorEstado(grupo.id)"
          :key="partido.id"
          :partido="partido"
          :zona-horaria="zonaHoraria"
          @click="analitica.registrarEvento('match_card_click')"
        />
      </div>
      <p v-else class="estado-vacio-resultados">No hay partidos {{ grupo.titulo.toLocaleLowerCase('es-CO') }} en este momento.</p>
      </section>
    </template>
  </div>
</template>
