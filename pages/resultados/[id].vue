<script setup lang="ts">
import { Bell, CalendarDays, MapPin, RefreshCw, Star } from '@lucide/vue'
import type { DetallePartidoResultado, EquipoResultado, RespuestaMarcadorPartido } from '~/types/resultados'
import { agruparGoleadoresPartido } from '~/utils/goleadoresPartido'
import { construirUrlAbsoluta, imagenSeoPredeterminada, robotsNoIndex } from '~/utils/seo'

const ruta = useRoute()
const zonaHoraria = ref('America/Bogota')
const pestanaActiva = ref<'estadisticas' | 'alineaciones'>('estadisticas')
type PestanaDetallePartido = { id: 'estadisticas' | 'alineaciones'; etiqueta: string }
const actualizandoMarcador = ref(false)
const errorActualizacion = ref(false)
const { estaSiguiendo, alternarSeguimiento, notificarCambioMarcador } = useSeguimientoPartidos()
let identificadorIntervalo: ReturnType<typeof setInterval> | undefined

const { data: detalle, status, error, refresh } = await useFetch<DetallePartidoResultado>(
  () => `/api/resultados/${ruta.params.id}`,
  { key: `detalle-resultado-${String(ruta.params.id)}` }
)

if (detalle.value?.partido.deporte === 'futbol') {
  try {
    const correspondencia = await $fetch<{ slug: string | null }>('/api/partidos-seo/correspondencia', {
      query: {
        competencia: detalle.value.partido.competencia,
        fechaIso: detalle.value.partido.fechaIso,
        local: detalle.value.partido.equipoLocal.nombre,
        visitante: detalle.value.partido.equipoVisitante.nombre
      }
    })
    if (correspondencia.slug) {
      await navigateTo(`/partidos/${correspondencia.slug}`, { redirectCode: 301, replace: true })
    }
  } catch {
    // La página de resultados sigue disponible si el mapeo canónico se degrada.
  }
}

const pestanas = computed<PestanaDetallePartido[]>(() => {
  const opciones: PestanaDetallePartido[] = []

  if (detalle.value?.partido.deporte === 'futbol') {
    return [
      { id: 'estadisticas', etiqueta: 'Estadísticas' },
      { id: 'alineaciones', etiqueta: 'Alineaciones' }
    ]
  }

  if (detalle.value?.estadisticas.length) {
    opciones.push({
      id: 'estadisticas',
      etiqueta: detalle.value.partido.deporte === 'baloncesto' ? 'Cuartos y estadísticas' : 'Estadísticas'
    })
  }
  if (detalle.value?.alineaciones.length) opciones.push({ id: 'alineaciones', etiqueta: 'Alineaciones' })

  return opciones
})

const pestanaSeleccionada = computed(() => pestanas.value.some(pestana => pestana.id === pestanaActiva.value)
  ? pestanaActiva.value
  : pestanas.value[0]?.id)
const goleadores = computed(() => agruparGoleadoresPartido(detalle.value))
const siguiendoPartido = computed(() => detalle.value ? estaSiguiendo(detalle.value.partido.id) : false)
const configuracion = useRuntimeConfig()

const textoActualizacion = computed(() => {
  if (actualizandoMarcador.value) return 'Actualizando marcador'
  if (errorActualizacion.value) return 'No fue posible actualizar'
  if (!detalle.value) return ''
  const hora = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: zonaHoraria.value
  })
    .format(new Date(detalle.value.actualizadoEn))
  return `Actualizado a las ${hora}`
})

onMounted(() => {
  const zonaDetectada = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (zonaDetectada) zonaHoraria.value = zonaDetectada
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
    const partidoAnterior = detalle.value.partido
    detalle.value = { ...detalle.value, partido: respuesta.partido, actualizadoEn: respuesta.actualizadoEn }
    notificarCambioMarcador(partidoAnterior, respuesta.partido)
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
              sport: obtenerNombreDeporte(partido.deporte),
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

function obtenerNombreDeporte(deporte: DetallePartidoResultado['partido']['deporte']): string {
  const nombres: Record<DetallePartidoResultado['partido']['deporte'], string> = {
    futbol: 'Fútbol',
    baloncesto: 'Baloncesto',
    tenis: 'Tenis',
    beisbol: 'Béisbol'
  }
  return nombres[deporte]
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
            <span><CalendarDays aria-hidden="true" /> {{ new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: zonaHoraria }).format(new Date(detalle.partido.fechaIso)) }}</span>
            <span>{{ detalle.partido.competencia }}</span>
            <span v-if="detalle.partido.estadio || detalle.partido.ciudad">
              <MapPin aria-hidden="true" />
              {{ [detalle.partido.estadio, detalle.partido.ciudad].filter(Boolean).join(', ') }}
            </span>
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
      <section v-if="goleadores.length" class="goleadores-detalle-partido" aria-label="Goleadores">
        <div v-for="grupo in goleadores" :key="grupo.equipoId" class="grupo-goleadores-detalle">
          <strong>{{ grupo.equipo }}</strong>
          <ul>
            <li v-for="(goleador, indice) in grupo.goleadores" :key="`${goleador.minuto}-${goleador.jugador}-${indice}`">
              <span>{{ goleador.jugador }}</span>
              <time>{{ goleador.minuto }}</time>
            </li>
          </ul>
        </div>
      </section>
      <PublicidadAdsterraSlot formato="leaderboard" contexto="detalle del partido" />

      <nav v-if="pestanas.length" class="pestanas-detalle-partido" aria-label="Información del partido">
        <button
          v-for="pestana in pestanas"
          :key="pestana.id"
          type="button"
          :class="{ activo: pestanaSeleccionada === pestana.id }"
          :aria-pressed="pestanaSeleccionada === pestana.id"
          @click="pestanaActiva = pestana.id"
        >{{ pestana.etiqueta }}</button>
      </nav>

      <div class="grilla-detalle-partido">
        <main class="contenido-principal-detalle">
          <EstadoDatosResultados
            v-if="!pestanas.length"
            descripcion="No hay estadísticas ni alineaciones detalladas disponibles para este partido."
          />

          <template v-else-if="pestanaSeleccionada === 'estadisticas'">
            <PanelEstadisticasPartido
              v-if="detalle.estadisticas.length"
              :estadisticas="detalle.estadisticas"
              :equipo-local="detalle.partido.equipoLocal"
              :equipo-visitante="detalle.partido.equipoVisitante"
            />
            <EstadoDatosResultados v-else descripcion="Las estadísticas todavía no están disponibles para este partido." />
          </template>

          <section v-else-if="pestanaSeleccionada === 'alineaciones'" class="panel-resultados panel-alineaciones">
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
            <span>
              <Bell aria-hidden="true" />
              {{ siguiendoPartido
                ? 'Alertas activas mientras mantengas este partido abierto.'
                : 'Sigue el partido para recibir cambios del marcador en esta pantalla.' }}
            </span>
          </section>
        </main>

        <aside
          v-if="detalle.eventos.length || detalle.clasificacion.length"
          class="contenido-lateral-detalle"
        >
          <LineaTiempoPartido v-if="detalle.eventos.length" :eventos="detalle.eventos" />
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

<style scoped>
.goleadores-detalle-partido {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 28px;
  margin: 12px 0 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface, #fff);
  padding: 13px 16px;
}

.grupo-goleadores-detalle { min-width: min(100%, 220px); }
.grupo-goleadores-detalle > strong { color: var(--muted); font-size: .76rem; }
.grupo-goleadores-detalle ul { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 6px 0 0; padding: 0; list-style: none; }
.grupo-goleadores-detalle li { display: inline-flex; align-items: baseline; gap: 6px; font-size: .84rem; font-weight: 750; }
.grupo-goleadores-detalle time { color: var(--muted); font-size: .74rem; font-weight: 650; }
</style>
