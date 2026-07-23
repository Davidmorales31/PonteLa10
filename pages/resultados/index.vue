<script setup lang="ts">
import { Activity, CircleDot, Trophy } from '@lucide/vue'
import type { DeporteResultado, EstadoPartido, RespuestaResultados } from '~/types/resultados'

const { data: respuesta, status, error, refresh } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'centro-resultados',
  lazy: true
})
const deporteActivo = ref<DeporteResultado | 'todos'>('todos')
const estadoActivo = ref<EstadoPartido | 'todos'>('todos')
const deportes: Array<{ id: DeporteResultado | 'todos'; etiqueta: string }> = [
  { id: 'todos', etiqueta: 'Todos' }, { id: 'futbol', etiqueta: 'Fútbol' },
  { id: 'baloncesto', etiqueta: 'Baloncesto' }, { id: 'tenis', etiqueta: 'Tenis' }, { id: 'beisbol', etiqueta: 'Béisbol' }
]
const estados: Array<{ id: EstadoPartido | 'todos'; etiqueta: string }> = [
  { id: 'todos', etiqueta: 'Todos' }, { id: 'en-vivo', etiqueta: 'En vivo' },
  { id: 'finalizado', etiqueta: 'Finalizados' }, { id: 'programado', etiqueta: 'Próximos' }
]
const partidosFiltrados = computed(() => (respuesta.value?.partidos || []).filter(partido =>
  (deporteActivo.value === 'todos' || partido.deporte === deporteActivo.value)
  && (estadoActivo.value === 'todos' || partido.estado === estadoActivo.value)
))
const partidoDestacado = computed(() => partidosFiltrados.value.find(partido => partido.destacado) || partidosFiltrados.value[0])
const partidosSecundarios = computed(() => partidosFiltrados.value.filter(partido => partido.id !== partidoDestacado.value?.id))
const cantidadEnVivo = computed(() => respuesta.value?.partidos.filter(partido => partido.estado === 'en-vivo').length || 0)

useSeoMeta({ title: 'Resultados y marcadores | Pont3la10', description: 'Partidos en vivo, marcadores recientes y próximos encuentros.' })
</script>

<template>
  <div class="pagina-resultados">
    <header class="cabecera-resultados">
      <div><p><CircleDot aria-hidden="true" /> Resultados en vivo</p><h1>Resultados y marcadores</h1><span>Sigue en vivo fútbol, baloncesto, tenis y más.</span></div>
      <div class="contador-en-vivo"><Activity aria-hidden="true" /><strong>{{ cantidadEnVivo }}</strong> en vivo</div>
    </header>

    <div class="barra-filtros-resultados">
      <div class="filtros-deporte" role="group" aria-label="Filtrar por deporte">
        <button v-for="deporte in deportes" :key="deporte.id" type="button" :class="{ activo: deporteActivo === deporte.id }" :aria-pressed="deporteActivo === deporte.id" @click="deporteActivo = deporte.id">{{ deporte.etiqueta }}</button>
      </div>
      <div class="filtros-estado" role="group" aria-label="Filtrar por estado">
        <button v-for="estado in estados" :key="estado.id" type="button" :class="{ activo: estadoActivo === estado.id }" :aria-pressed="estadoActivo === estado.id" @click="estadoActivo = estado.id">{{ estado.etiqueta }}</button>
      </div>
    </div>

    <EsqueletoResultados v-if="status === 'pending'" tipo="listado" />
    <EstadoDatosResultados
      v-else-if="error"
      descripcion="No fue posible consultar el proveedor deportivo. Intenta nuevamente."
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
          <div class="titulo-panel-resultados"><div><Trophy aria-hidden="true" /><h2 id="titulo-partidos-resultados">Partidos destacados</h2></div><span>{{ partidosSecundarios.length }} encuentros</span></div>
          <div v-if="partidosSecundarios.length" class="grilla-marcadores-resultados">
            <TarjetaMarcadorCompacto v-for="partido in partidosSecundarios" :key="partido.id" :partido="partido" />
          </div>
          <div v-else class="estado-vacio-resultados">No hay partidos para estos filtros.</div>
        </section>
      </div>
      <aside class="columna-lateral-resultados" aria-label="Clasificación rápida">
        <section v-if="respuesta.clasificacion.length" class="panel-resultados panel-tabla-rapida">
          <div class="titulo-panel-resultados"><h2>Tabla rápida</h2><span>Liga BetPlay</span></div>
          <TablaClasificacionResultados :posiciones="respuesta.clasificacion" />
        </section>
        <section class="panel-resultados aviso-fuente-resultados">
          <strong>Datos actualizados</strong>
          <p>{{ respuesta.aviso || 'Marcadores actualizados automáticamente desde el proveedor deportivo.' }}</p>
          <button type="button" @click="refresh()">Actualizar</button>
        </section>
      </aside>
    </div>
  </div>
</template>
