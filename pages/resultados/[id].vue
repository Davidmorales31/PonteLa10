<script setup lang="ts">
import { Bell, CalendarDays, MapPin, RefreshCw, Star } from '@lucide/vue'
import type { DetallePartidoResultado, EquipoResultado, RespuestaMarcadorPartido } from '~/types/resultados'
import { construirUrlAbsoluta, imagenSeoPredeterminada, robotsNoIndex } from '~/utils/seo'

const ruta = useRoute()
const pestanaActiva = ref<'resumen' | 'estadisticas' | 'alineaciones' | 'minuto'>('resumen')
const actualizandoMarcador = ref(false)
const errorActualizacion = ref(false)
const { estaSiguiendo, alternarSeguimiento, notificarCambioMarcador } = useSeguimientoPartidos()
let identificadorIntervalo: ReturnType<typeof setInterval> | undefined

const { data: detalle, status, error, refresh } = await useFetch<DetallePartidoResultado>(
  () => `/api/resultados/${ruta.params.id}`,
  { key: `detalle-resultado-${String(ruta.params.id)}`, lazy: true }
)

const pestanas = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'estadisticas', etiqueta: 'Estadísticas' },
  { id: 'alineaciones', etiqueta: 'Alineaciones' },
  { id: 'minuto', etiqueta: 'Minuto a minuto' }
] as const

const siguiendoPartido = computed(() => detalle.value ? estaSiguiendo(detalle.value.partido.id) : false)
const configuracion = useRuntimeConfig()

const textoActualizacion = computed(() => {
  if (actualizandoMarcador.value) return 'Actualizando marcador'
  if (errorActualizacion.value) return 'No fue posible actualizar'
  if (!detalle.value) return ''
  const hora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(new Date(detalle.value.actualizadoEn))
  return `Actualizado a las ${hora}`
})

onMounted(() => {
  identificadorIntervalo = setInterval(actualizarMarcador, 60_000)
})

onBeforeUnmount(() => {
  if (identificadorIntervalo) clearInterval(identificadorIntervalo)
})

async function actualizarMarcador() {
  if (!detalle.value || detalle.value.partido.estado !== 'en-vivo' || actualizandoMarcador.value) return

  actualizandoMarcador.value = true
  errorActualizacion.value = false
  try {
    const respuesta = await $fetch<RespuestaMarcadorPartido>(`/api/resultados/${ruta.params.id}/marcador`)
    const marcadorCambio = detalle.value.partido.marcadorLocal !== respuesta.partido.marcadorLocal
      || detalle.value.partido.marcadorVisitante !== respuesta.partido.marcadorVisitante
    detalle.value = { ...detalle.value, partido: respuesta.partido, actualizadoEn: respuesta.actualizadoEn }
    if (marcadorCambio) notificarCambioMarcador(respuesta.partido)
  } catch {
    errorActualizacion.value = true
  } finally {
    actualizandoMarcador.value = false
  }
}

async function alternarSeguimientoActual() {
  if (detalle.value) await alternarSeguimiento(detalle.value.partido)
}

function obtenerEquipoAlineacion(equipoId: string): EquipoResultado {
  if (detalle.value?.partido.equipoLocal.id === equipoId) return detalle.value.partido.equipoLocal
  return detalle.value?.partido.equipoVisitante || { id: equipoId, nombre: 'Equipo', nombreCorto: 'EQ' }
}

useSeoPont3la10(() => {
  const partido = detalle.value?.partido
  const nombrePartido = partido
    ? `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}`
    : 'Detalle del partido'
  const marcador = partido?.marcadorLocal !== undefined && partido.marcadorVisitante !== undefined
    ? ` ${partido.marcadorLocal}-${partido.marcadorVisitante}`
    : ''
  const descripcion = partido
    ? `${nombrePartido}${marcador}: marcador, resumen, estadísticas, eventos y alineaciones disponibles en Pont3la10.`
    : 'Marcador, resumen, estadísticas, eventos y alineaciones disponibles del partido.'
  const rutaCanonica = `/resultados/${String(ruta.params.id)}`
  const urlCanonica = construirUrlAbsoluta(String(configuracion.public.siteUrl), rutaCanonica)

  return {
    titulo: `${nombrePartido}${marcador} | Pont3la10`,
    descripcion,
    rutaCanonica,
    imagen: partido?.equipoLocal.logo || partido?.equipoVisitante.logo || imagenSeoPredeterminada,
    robots: error.value ? robotsNoIndex : undefined,
    datosEstructurados: partido
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Inicio',
                  item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/')
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Resultados',
                  item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/resultados')
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: nombrePartido,
                  item: urlCanonica
                }
              ]
            },
            {
              '@type': 'SportsEvent',
              name: nombrePartido,
              description: descripcion,
              url: urlCanonica,
              startDate: partido.fechaIso,
              eventStatus: obtenerEstadoSchema(partido.estado),
              sport: 'Fútbol',
              homeTeam: {
                '@type': 'SportsTeam',
                name: partido.equipoLocal.nombre,
                logo: partido.equipoLocal.logo
              },
              awayTeam: {
                '@type': 'SportsTeam',
                name: partido.equipoVisitante.nombre,
                logo: partido.equipoVisitante.logo
              },
              location: partido.estadio
                ? {
                    '@type': 'Place',
                    name: partido.estadio,
                    address: partido.ciudad
                  }
                : undefined
            }
          ]
        }
      : undefined
  }
})

function obtenerEstadoSchema(estado: DetallePartidoResultado['partido']['estado']): string {
  if (estado === 'en-vivo') return 'https://schema.org/EventInProgress'
  if (estado === 'finalizado') return 'https://schema.org/EventCompleted'
  return 'https://schema.org/EventScheduled'
}
</script>

<template>
  <div class="pagina-detalle-resultado">
    <EsqueletoResultados v-if="status === 'pending'" tipo="detalle" />
    <EstadoDatosResultados
      v-else-if="error"
      descripcion="No fue posible consultar el partido. El proveedor no entregó datos disponibles."
      :permitir-reintento="true"
      @reintentar="refresh"
    />
    <template v-else-if="detalle">
      <header class="cabecera-detalle-partido">
        <div>
          <p>Resultados {{ detalle.partido.estado === 'en-vivo' ? 'en vivo' : 'del partido' }}</p>
          <h1>{{ detalle.partido.equipoLocal.nombre }} vs {{ detalle.partido.equipoVisitante.nombre }}</h1>
          <div class="metadatos-partido">
            <span><CalendarDays aria-hidden="true" /> {{ new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(detalle.partido.fechaIso)) }}</span>
            <span>{{ detalle.partido.competencia }}</span>
            <span v-if="detalle.partido.estadio"><MapPin aria-hidden="true" /> {{ detalle.partido.estadio }}, {{ detalle.partido.ciudad }}</span>
          </div>
        </div>
        <div class="estado-detalle-en-vivo">
          <EtiquetaEstadoPartido :partido="detalle.partido" />
          <span :class="{ error: errorActualizacion }">
            <RefreshCw v-if="actualizandoMarcador" class="icono-girando" aria-hidden="true" />
            {{ textoActualizacion }}
          </span>
        </div>
      </header>

      <PartidoDestacadoResultados :partido="detalle.partido" :mostrar-enlace="false" />

      <nav class="pestanas-detalle-partido" aria-label="Información del partido">
        <button
          v-for="pestana in pestanas"
          :key="pestana.id"
          type="button"
          :class="{ activo: pestanaActiva === pestana.id }"
          :aria-pressed="pestanaActiva === pestana.id"
          @click="pestanaActiva = pestana.id"
        >{{ pestana.etiqueta }}</button>
      </nav>

      <div class="grilla-detalle-partido">
        <main class="contenido-principal-detalle">
          <PanelResumenPartido v-if="pestanaActiva === 'resumen'" :detalle="detalle" />

          <template v-else-if="pestanaActiva === 'estadisticas'">
            <PanelEstadisticasPartido
              v-if="detalle.estadisticas.length"
              :estadisticas="detalle.estadisticas"
              :equipo-local="detalle.partido.equipoLocal"
              :equipo-visitante="detalle.partido.equipoVisitante"
            />
            <EstadoDatosResultados v-else descripcion="Las estadísticas todavía no están disponibles para este partido." />
          </template>

          <template v-else-if="pestanaActiva === 'minuto'">
            <LineaTiempoPartido v-if="detalle.eventos.length" :eventos="detalle.eventos" />
            <EstadoDatosResultados v-else descripcion="No hay eventos disponibles para este partido." />
          </template>

          <section v-else class="panel-resultados panel-alineaciones">
            <h2>Alineaciones</h2>
            <div v-if="detalle.alineaciones.length" class="grilla-alineaciones">
              <article v-for="alineacion in detalle.alineaciones" :key="alineacion.equipoId">
                <header>
                  <EscudoEquipo :equipo="obtenerEquipoAlineacion(alineacion.equipoId)" tamano="mediano" />
                  <div>
                    <h3>{{ obtenerEquipoAlineacion(alineacion.equipoId).nombre }}</h3>
                    <strong>{{ alineacion.formacion }}</strong>
                  </div>
                </header>
                <p>DT: {{ alineacion.entrenador }}</p>
                <ol><li v-for="jugador in alineacion.titulares" :key="jugador">{{ jugador }}</li></ol>
              </article>
            </div>
            <EstadoDatosResultados v-else descripcion="Las alineaciones todavía no están disponibles para este partido." />
          </section>

          <section class="acciones-seguimiento-partido">
            <button type="button" :class="{ activo: siguiendoPartido }" @click="alternarSeguimientoActual">
              <Star aria-hidden="true" /> {{ siguiendoPartido ? 'Siguiendo partido' : 'Seguir partido' }}
            </button>
            <span><Bell aria-hidden="true" /> Recibe alertas de goles y momentos clave.</span>
          </section>
        </main>

        <aside class="contenido-lateral-detalle">
          <template v-if="pestanaActiva !== 'minuto'">
            <LineaTiempoPartido v-if="detalle.eventos.length" :eventos="detalle.eventos" />
            <EstadoDatosResultados v-else descripcion="No hay eventos disponibles para este partido." />
          </template>
          <section v-if="detalle.clasificacion.length" class="panel-resultados panel-tabla-rapida">
            <div class="titulo-panel-resultados"><h2>Clasificación</h2><span>{{ detalle.partido.competencia }}</span></div>
            <TablaClasificacionResultados :posiciones="detalle.clasificacion" />
          </section>
        </aside>
      </div>
    </template>
    <EstadoDatosResultados v-else :permitir-reintento="true" @reintentar="refresh" />
  </div>
</template>
