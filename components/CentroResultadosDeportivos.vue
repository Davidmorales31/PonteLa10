<script setup lang="ts">
import { Activity, CircleDot, Star, Trophy } from '@lucide/vue'
import type { DeporteResultado, EstadoPartido, RespuestaResultados } from '~/types/resultados'

const propiedades = withDefaults(defineProps<{
  deporte?: DeporteResultado | 'todos'
}>(), {
  deporte: 'todos'
})

const rutasDeportes: Array<{
  id: DeporteResultado | 'todos'
  etiqueta: string
  ruta: string
}> = [
  { id: 'todos', etiqueta: 'Todos', ruta: '/resultados' },
  { id: 'futbol', etiqueta: 'Fútbol', ruta: '/resultados/futbol' },
  { id: 'baloncesto', etiqueta: 'Baloncesto', ruta: '/resultados/baloncesto' },
  { id: 'tenis', etiqueta: 'Tenis', ruta: '/resultados/tenis' },
  { id: 'beisbol', etiqueta: 'Béisbol', ruta: '/resultados/beisbol' }
]
const estados: Array<{ id: EstadoPartido | 'todos'; etiqueta: string }> = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'en-vivo', etiqueta: 'En vivo' },
  { id: 'finalizado', etiqueta: 'Finalizados' },
  { id: 'programado', etiqueta: 'Próximos' }
]
const nombresDeporte: Record<DeporteResultado | 'todos', string> = {
  todos: 'deportes',
  futbol: 'fútbol',
  baloncesto: 'baloncesto',
  tenis: 'tenis',
  beisbol: 'béisbol'
}
const queryResultados = propiedades.deporte === 'todos'
  ? undefined
  : { deporte: propiedades.deporte }
const { data: respuesta, status, error, refresh } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: `centro-resultados-${propiedades.deporte}`,
  query: queryResultados,
  lazy: true
})
const estadoActivo = ref<EstadoPartido | 'todos'>('todos')
const soloSeguidos = ref(false)
const { partidosSeguidos } = useSeguimientoPartidos()

const partidosFiltrados = computed(() => (respuesta.value?.partidos || []).filter(partido =>
  (estadoActivo.value === 'todos' || partido.estado === estadoActivo.value)
  && (!soloSeguidos.value || partidosSeguidos.value.includes(partido.id))
))
const partidoDestacado = computed(() => (
  partidosFiltrados.value.find(partido => partido.destacado) || partidosFiltrados.value[0]
))
const partidosSecundarios = computed(() => (
  partidosFiltrados.value.filter(partido => partido.id !== partidoDestacado.value?.id)
))
const cantidadEnVivo = computed(() => (
  respuesta.value?.partidos.filter(partido => partido.estado === 'en-vivo').length || 0
))
const tituloResultados = computed(() => (
  propiedades.deporte === 'todos'
    ? 'Resultados y marcadores'
    : `Resultados de ${nombresDeporte[propiedades.deporte]}`
))
const etiquetaOrigen = computed(() => {
  const etiquetas: Record<RespuestaResultados['origen'], string> = {
    'api-sports': 'API-Football',
    'api-basketball': 'API-Basketball',
    'the-sports-db': 'TheSportsDB',
    mixto: 'proveedores deportivos'
  }
  return respuesta.value ? etiquetas[respuesta.value.origen] : 'proveedor deportivo'
})
</script>

<template>
  <div class="pagina-resultados">
    <header class="cabecera-resultados">
      <div>
        <p><CircleDot aria-hidden="true" /> Resultados en vivo</p>
        <h1>{{ tituloResultados }}</h1>
        <span>Partidos, marcadores y datos reales de {{ nombresDeporte[deporte] }}.</span>
      </div>
      <div class="contador-en-vivo">
        <Activity aria-hidden="true" />
        <strong>{{ cantidadEnVivo }}</strong> en vivo
      </div>
    </header>

    <div class="barra-filtros-resultados">
      <nav class="filtros-deporte" aria-label="Resultados por deporte">
        <NuxtLink
          v-for="opcion in rutasDeportes"
          :key="opcion.id"
          :to="opcion.ruta"
          :class="{ activo: deporte === opcion.id }"
          :aria-current="deporte === opcion.id ? 'page' : undefined"
        >
          {{ opcion.etiqueta }}
        </NuxtLink>
      </nav>
      <div class="filtros-estado" role="group" aria-label="Filtrar por estado">
        <button
          v-for="estado in estados"
          :key="estado.id"
          type="button"
          :class="{ activo: estadoActivo === estado.id }"
          :aria-pressed="estadoActivo === estado.id"
          @click="estadoActivo = estado.id"
        >
          {{ estado.etiqueta }}
        </button>
        <button
          type="button"
          :class="{ activo: soloSeguidos }"
          :aria-pressed="soloSeguidos"
          @click="soloSeguidos = !soloSeguidos"
        >
          <Star aria-hidden="true" /> Siguiendo
        </button>
      </div>
    </div>

    <EsqueletoResultados v-if="status === 'pending'" tipo="listado" />
    <EstadoDatosResultados
      v-else-if="error"
      descripcion="No fue posible consultar los proveedores deportivos. Intenta nuevamente."
      :permitir-reintento="true"
      @reintentar="refresh"
    />
    <EstadoDatosResultados
      v-else-if="!partidoDestacado"
      :descripcion="respuesta?.aviso"
      :permitir-reintento="true"
      @reintentar="refresh"
    />
    <div v-else-if="partidoDestacado && respuesta" class="contenido-resultados">
      <div class="columna-principal-resultados">
        <PartidoDestacadoResultados :partido="partidoDestacado" />
        <section class="seccion-lista-resultados" aria-labelledby="titulo-partidos-resultados">
          <div class="titulo-panel-resultados">
            <div>
              <Trophy aria-hidden="true" />
              <h2 id="titulo-partidos-resultados">Partidos destacados</h2>
            </div>
            <span>{{ partidosSecundarios.length }} encuentros</span>
          </div>
          <div v-if="partidosSecundarios.length" class="grilla-marcadores-resultados">
            <TarjetaMarcadorCompacto
              v-for="partido in partidosSecundarios"
              :key="partido.id"
              :partido="partido"
            />
          </div>
          <div v-else class="estado-vacio-resultados">No hay partidos para estos filtros.</div>
        </section>
      </div>
      <aside class="columna-lateral-resultados" aria-label="Información de resultados">
        <section v-if="respuesta.clasificacion.length" class="panel-resultados panel-tabla-rapida">
          <div class="titulo-panel-resultados">
            <h2>Tabla rápida</h2>
            <span>Clasificación</span>
          </div>
          <TablaClasificacionResultados :posiciones="respuesta.clasificacion" />
        </section>
        <section class="panel-resultados aviso-fuente-resultados">
          <strong>Datos actualizados</strong>
          <p>
            {{ respuesta.aviso || `Marcadores actualizados automáticamente desde ${etiquetaOrigen}.` }}
          </p>
          <button type="button" @click="refresh()">Actualizar</button>
        </section>
      </aside>
    </div>
  </div>
</template>
