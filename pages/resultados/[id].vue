<script setup lang="ts">
import { Bell, CalendarDays, MapPin, RefreshCw, Star } from '@lucide/vue'
import type { DetallePartidoResultado, EquipoResultado, RespuestaMarcadorPartido } from '~/types/resultados'

const ruta = useRoute()
const pestanaActiva = ref<'resumen' | 'estadisticas' | 'alineaciones' | 'minuto'>('resumen')
const siguiendoPartido = ref(false)
const actualizandoMarcador = ref(false)
const errorActualizacion = ref(false)
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
    detalle.value = { ...detalle.value, partido: respuesta.partido, actualizadoEn: respuesta.actualizadoEn }
  } catch {
    errorActualizacion.value = true
  } finally {
    actualizandoMarcador.value = false
  }
}

function obtenerEquipoAlineacion(equipoId: string): EquipoResultado {
  if (detalle.value?.partido.equipoLocal.id === equipoId) return detalle.value.partido.equipoLocal
  return detalle.value?.partido.equipoVisitante || { id: equipoId, nombre: 'Equipo', nombreCorto: 'EQ' }
}

useSeoMeta({
  title: () => detalle.value
    ? `${detalle.value.partido.equipoLocal.nombre} vs ${detalle.value.partido.equipoVisitante.nombre} | Pont3la10`
    : 'Detalle del partido | Pont3la10',
  description: 'Marcador, estadísticas, eventos y alineaciones reales del partido.'
})
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

      <PartidoDestacadoResultados :partido="detalle.partido" />

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
          <template v-if="pestanaActiva === 'resumen' || pestanaActiva === 'estadisticas'">
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
            <button type="button" :class="{ activo: siguiendoPartido }" @click="siguiendoPartido = !siguiendoPartido">
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
