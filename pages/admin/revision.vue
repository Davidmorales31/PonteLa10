<script setup lang="ts">
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  Inbox,
  RefreshCw,
  Trash2
} from '@lucide/vue'
import ModalEliminarContenido from '~/components/admin/ModalEliminarContenido.vue'
import type {
  ColaRevisionEditorial,
  ElementoColaRevisionEditorial
} from '~/types/contenidoEditorial'
import type { RespuestaOportunidadesEditorialesCodex } from '~/types/oportunidadesEditoriales'
import { etiquetasTipoContenido } from '~/utils/editorial/contenido'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.revisar'
})

useSeoMeta({
  title: 'Bandeja de revisión | Pont3la10',
  robots: 'noindex, nofollow'
})

const { data: cola, status, error, refresh } = await useFetch<ColaRevisionEditorial>(
  '/api/admin/revision'
)
const {
  data: oportunidades,
  status: estadoOportunidades,
  error: errorOportunidades,
  refresh: recargarOportunidades
} = await useFetch<RespuestaOportunidadesEditorialesCodex>(
  '/api/admin/oportunidades-editoriales'
)
const route = useRoute()
const { contextoEditorial, tienePermiso } = useContextoEditorial()
const articuloEliminar = ref<ElementoColaRevisionEditorial | null>(null)
const mensajeEstado = ref('')
const retornoRevision = computed(() => route.fullPath)
const limiteOportunidadesVisibles = ref(10)

const oportunidadesVisibles = computed(() =>
  (oportunidades.value?.oportunidades || []).slice(0, limiteOportunidadesVisibles.value)
)

const secciones = computed(() => [
  {
    id: 'revision',
    titulo: 'En revisión',
    descripcion: 'Contenidos que esperan observaciones o aprobación.',
    icono: ClipboardCheck,
    elementos: cola.value?.enRevision || []
  },
  {
    id: 'aprobados',
    titulo: 'Aprobados',
    descripcion: 'Listos para programar o publicar.',
    icono: BadgeCheck,
    elementos: cola.value?.aprobados || []
  },
  {
    id: 'programados',
    titulo: 'Programados',
    descripcion: 'Publicaciones con una fecha definida.',
    icono: CalendarClock,
    elementos: cola.value?.programados || []
  }
])

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}

function fechaPrioritaria(item: ElementoColaRevisionEditorial): string {
  return item.programadoPara || item.actualizadoEn
}

async function contenidoEliminado() {
  articuloEliminar.value = null
  mensajeEstado.value = 'El contenido se eliminó definitivamente.'
  await refresh()
}

function etiquetaRecomendacion(recomendacion: string | null): string {
  const etiquetas: Record<string, string> = {
    create: 'Crear borrador',
    update: 'Actualizar',
    merge: 'Evaluar fusión',
    expand: 'Ampliar página',
    discard: 'Descartar',
    pendiente: 'Pendiente de evaluación'
  }
  return etiquetas[recomendacion || 'pendiente'] || 'Pendiente de evaluación'
}

function claseRecomendacion(recomendacion: string | null): string {
  return `insignia-recomendacion insignia-recomendacion-${recomendacion || 'pendiente'}`
}

function fechaCorrida(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}

function etiquetaEstadoCorrida(estado: string): string {
  const etiquetas: Record<string, string> = {
    in_progress: 'En curso',
    completed: 'Completada',
    partial: 'Parcial',
    failed: 'Fallida'
  }
  return etiquetas[estado] || 'Estado no disponible'
}

function etiquetaRiesgoCanibalizacion(riesgo: string | null): string {
  const etiquetas: Record<string, string> = {
    none: 'Sin riesgo',
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto'
  }
  return riesgo ? etiquetas[riesgo] || 'No disponible' : 'No evaluado'
}

function etiquetaEstadoPropuesta(estado: string): string {
  const etiquetas: Record<string, string> = {
    draft: 'borrador',
    review: 'en revisión',
    changes_requested: 'requiere cambios',
    approved: 'aprobado',
    scheduled: 'programado',
    published: 'publicado',
    archived: 'archivado'
  }
  return etiquetas[estado] || 'estado no disponible'
}

async function recargarTodo() {
  await Promise.all([refresh(), recargarOportunidades()])
}
</script>

<template>
  <div class="vista-panel-editorial vista-bandeja-revision">
    <header class="cabecera-vista-panel">
      <div>
        <p class="etiqueta-panel">Operación editorial · HU-ED-26</p>
        <h1>Bandeja de revisión</h1>
        <p>Revisa artículos y evalúa si conviene actualizar antes de crear otra URL.</p>
      </div>
      <button class="boton-editorial-secundario" type="button" @click="recargarTodo">
        <RefreshCw aria-hidden="true" />
        <span>Actualizar bandeja</span>
      </button>
    </header>

    <p v-if="mensajeEstado" class="aviso-exito-editorial" role="status">
      {{ mensajeEstado }}
    </p>

    <div v-if="status === 'pending'" class="esqueleto-cola-revision" aria-label="Cargando revisión">
      <span v-for="indice in 9" :key="indice" />
    </div>

    <section v-else-if="error" class="estado-vacio-panel">
      <Inbox aria-hidden="true" />
      <h2>No pudimos cargar la bandeja</h2>
      <p>Comprueba la conexión y vuelve a intentarlo.</p>
      <button class="boton-editorial-secundario" type="button" @click="() => refresh()">
        Reintentar
      </button>
    </section>

    <div v-else class="columnas-cola-revision">
      <section
        v-for="seccion in secciones"
        :key="seccion.id"
        class="columna-cola-revision"
        :aria-labelledby="`titulo-cola-${seccion.id}`"
      >
        <header>
          <span><component :is="seccion.icono" aria-hidden="true" /></span>
          <div>
            <h2 :id="`titulo-cola-${seccion.id}`">{{ seccion.titulo }}</h2>
            <p>{{ seccion.descripcion }}</p>
          </div>
          <strong>{{ seccion.elementos.length }}</strong>
        </header>

        <div v-if="seccion.elementos.length" class="lista-cola-revision">
          <article v-for="item in seccion.elementos" :key="item.id">
            <div class="meta-item-revision">
              <span>{{ etiquetasTipoContenido[item.tipo] }}</span>
              <span v-if="item.categoria">{{ item.categoria.nombre }}</span>
            </div>
            <h3>{{ item.titulo }}</h3>
            <p>{{ item.resumen || 'Sin resumen editorial.' }}</p>
            <div class="pie-item-revision">
              <span>
                <Clock3 aria-hidden="true" />
                {{ formatearFecha(fechaPrioritaria(item)) }}
              </span>
              <div class="acciones-item-revision">
                <button
                  v-if="tienePermiso('contenido.eliminar')"
                  type="button"
                  title="Eliminar contenido"
                  :aria-label="`Eliminar ${item.titulo}`"
                  @click="articuloEliminar = item"
                >
                  <Trash2 aria-hidden="true" />
                </button>
                <NuxtLink
                  :to="`/admin/contenidos/${item.id}`"
                  :aria-label="`Abrir ${item.titulo}`"
                >
                  <ArrowRight aria-hidden="true" />
                </NuxtLink>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="cola-revision-vacia">
          <Inbox aria-hidden="true" />
          <span>Sin contenidos en esta etapa.</span>
        </div>
      </section>
    </div>

    <section class="seccion-oportunidades-editoriales" aria-labelledby="titulo-oportunidades-editoriales">
      <header class="cabecera-oportunidades-editoriales">
        <div>
          <p class="etiqueta-panel">HU-ED-26 · Actualizar antes de crear</p>
          <h2 id="titulo-oportunidades-editoriales">Evaluación de oportunidades</h2>
          <p>Compara cada tema con artículos y entidades existentes antes de abrir una URL nueva.</p>
        </div>
        <span v-if="oportunidades?.corrida" class="estado-corrida-oportunidad">
          {{ etiquetaEstadoCorrida(oportunidades.corrida.status) }} · {{ fechaCorrida(oportunidades.corrida.updatedAt) }}
        </span>
      </header>

      <p class="nota-oportunidades-editoriales">
        Estas son recomendaciones de apoyo. Aquí no se modifica, fusiona, descarta ni publica contenido;
        la decisión editorial final sigue siendo humana.
      </p>

      <section v-if="estadoOportunidades === 'pending' && !oportunidades" class="estado-vacio-panel" role="status">
        Cargando evaluaciones editoriales…
      </section>
      <section v-else-if="errorOportunidades" class="aviso-panel aviso-panel-error" role="alert">
        <Inbox aria-hidden="true" />
        <div>
          <strong>No se pudo cargar la evaluación</strong>
          <span>La bandeja permanece disponible; intenta cargar de nuevo las oportunidades.</span>
        </div>
        <button class="boton-editorial-secundario" type="button" @click="() => recargarOportunidades()">Reintentar</button>
      </section>
      <section v-else-if="!oportunidades?.corrida || !oportunidades.oportunidades.length" class="cola-revision-vacia">
        <Inbox aria-hidden="true" />
        <span>
          {{ oportunidades?.corrida
            ? oportunidades.candidatasInvalidas
              ? `No hay oportunidades válidas; se omitieron ${oportunidades.candidatasInvalidas} candidatas que no cumplen el contrato.`
              : 'La última corrida no tiene oportunidades guardadas.'
            : 'Aún no hay corridas editoriales.' }}
        </span>
      </section>
      <div v-else class="lista-oportunidades-editoriales">
        <p class="resumen-oportunidades-editoriales">
          {{ oportunidades.oportunidades.length }} oportunidades en la última corrida.
          <span v-if="oportunidades.candidatasInvalidas">
            {{ oportunidades.candidatasInvalidas }} candidatas se omitieron por no cumplir el contrato.
          </span>
        </p>
        <article v-for="oportunidad in oportunidadesVisibles" :key="oportunidad.id" class="tarjeta-oportunidad-editorial">
          <header>
            <div class="meta-oportunidad-editorial">
              <span>{{ oportunidad.categoryName }}</span>
              <span :class="claseRecomendacion(oportunidad.recommendation)">
                {{ etiquetaRecomendacion(oportunidad.recommendation) }}
              </span>
              <span v-if="oportunidad.priorityScore !== null" class="puntaje-oportunidad-editorial">
                {{ oportunidad.priorityScore }}/100
              </span>
            </div>
            <h3>{{ oportunidad.title }}</h3>
            <p class="termino-oportunidad-editorial">Tema investigado: {{ oportunidad.term }}</p>
          </header>

          <p v-if="oportunidad.evaluacion === 'pendiente'" class="aviso-evaluacion-pendiente">
            Esta oportunidad se guardó con el contrato anterior y necesita una evaluación actual antes de crear.
          </p>
          <template v-else>
            <div v-if="oportunidad.noveltyRationale" class="detalle-oportunidad-editorial">
              <strong>Por qué aporta algo nuevo</strong>
              <p>{{ oportunidad.noveltyRationale }}</p>
            </div>
            <div v-if="oportunidad.differentiator" class="detalle-oportunidad-editorial">
              <strong>Diferenciador</strong>
              <p>{{ oportunidad.differentiator }}</p>
            </div>
            <dl class="datos-oportunidad-editorial">
              <div>
                <dt>Riesgo de canibalización</dt>
                <dd>{{ etiquetaRiesgoCanibalizacion(oportunidad.cannibalizationRisk) }}</dd>
              </div>
              <div v-if="oportunidad.updateability !== null">
                <dt>Posibilidad de actualización</dt>
                <dd>{{ oportunidad.updateability }}/100</dd>
              </div>
              <div v-if="oportunidad.entityMatch">
                <dt>Entidad relacionada</dt>
                <dd>{{ oportunidad.entityMatch.name }}</dd>
              </div>
            </dl>

            <div v-if="oportunidad.targetUrl" class="enlaces-oportunidad-editorial">
              <strong>Destino existente</strong>
              <NuxtLink v-if="oportunidad.targetArticle" :to="`/admin/contenidos/${oportunidad.targetArticle.id}`">
                {{ oportunidad.targetArticle.title }} · abrir en el CMS
              </NuxtLink>
              <span v-else-if="oportunidad.targetUrl.startsWith('/articulos/')">
                {{ oportunidad.targetUrl }} · destino no verificado entre artículos publicados
              </span>
              <NuxtLink v-else :to="oportunidad.targetUrl" target="_blank" rel="noopener noreferrer">
                {{ oportunidad.targetUrl }} · abrir página pública
              </NuxtLink>
            </div>
            <div v-if="oportunidad.similarArticles.length" class="enlaces-oportunidad-editorial">
              <strong>Publicaciones similares verificadas</strong>
              <NuxtLink
                v-for="articulo in oportunidad.similarArticles"
                :key="articulo.id"
                :to="`/articulos/${articulo.slug}`"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ articulo.title }}
              </NuxtLink>
            </div>
            <div v-if="oportunidad.proposalArticle" class="estado-propuesta-oportunidad">
              <span>Borrador relacionado: {{ etiquetaEstadoPropuesta(oportunidad.proposalArticle.status) }}</span>
              <NuxtLink :to="`/admin/contenidos/${oportunidad.proposalArticle.id}`">
                Abrir en el CMS <ArrowRight aria-hidden="true" />
              </NuxtLink>
            </div>
          </template>
        </article>
        <button
          v-if="limiteOportunidadesVisibles < oportunidades.oportunidades.length"
          class="boton-editorial-secundario"
          type="button"
          @click="limiteOportunidadesVisibles += 10"
        >
          Mostrar más oportunidades
        </button>
      </div>
    </section>

    <ModalEliminarContenido
      v-if="articuloEliminar"
      :articulo="articuloEliminar"
      :nivel-aal="contextoEditorial?.nivelAal || undefined"
      :retorno="retornoRevision"
      @cerrar="articuloEliminar = null"
      @eliminado="contenidoEliminado"
    />
  </div>
</template>

<style scoped>
.seccion-oportunidades-editoriales { display: grid; gap: 1rem; margin-top: 1.5rem; }
.cabecera-oportunidades-editoriales { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.cabecera-oportunidades-editoriales h2 { margin: .15rem 0 .35rem; color: var(--texto-panel, #10243e); }
.cabecera-oportunidades-editoriales p:last-child { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.estado-corrida-oportunidad { display: inline-flex; align-items: center; width: fit-content; border-radius: 999px; padding: .3rem .65rem; color: #075985; background: #dff4ff; font-size: .8rem; font-weight: 700; }
.nota-oportunidades-editoriales { margin: 0; padding: .8rem 1rem; border-left: 3px solid #0784dc; background: var(--superficie-panel, #fff); color: var(--texto-secundario-panel, #64748b); }
.lista-oportunidades-editoriales { display: grid; gap: .85rem; }
.resumen-oportunidades-editoriales { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.resumen-oportunidades-editoriales span { display: block; margin-top: .25rem; }
.tarjeta-oportunidad-editorial { display: grid; gap: .8rem; padding: 1rem; border: 1px solid var(--borde-panel, #cbd5e1); border-radius: 1rem; background: var(--superficie-panel, #fff); color: var(--texto-panel, #10243e); }
.tarjeta-oportunidad-editorial h3 { margin: .55rem 0 .15rem; font-size: 1rem; }
.meta-oportunidad-editorial { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; color: var(--texto-secundario-panel, #64748b); font-size: .82rem; }
.insignia-recomendacion, .puntaje-oportunidad-editorial { display: inline-flex; align-items: center; width: fit-content; border-radius: 999px; padding: .25rem .55rem; font-weight: 700; }
.insignia-recomendacion-update, .insignia-recomendacion-merge, .insignia-recomendacion-expand { color: #075985; background: #dff4ff; }
.insignia-recomendacion-create { color: #08713f; background: #e3f6eb; }
.insignia-recomendacion-discard { color: #7f1d1d; background: #fee7e7; }
.insignia-recomendacion-pendiente { color: #8a4b00; background: #fff1cc; }
.puntaje-oportunidad-editorial { color: var(--texto-panel, #10243e); background: var(--superficie-secundaria-panel, #edf2f7); }
.termino-oportunidad-editorial, .detalle-oportunidad-editorial p { margin: 0; color: var(--texto-secundario-panel, #64748b); }
.detalle-oportunidad-editorial { display: grid; gap: .2rem; }
.datos-oportunidad-editorial { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin: 0; }
.datos-oportunidad-editorial div { display: flex; gap: .4rem; }
.datos-oportunidad-editorial dt { color: var(--texto-secundario-panel, #64748b); }
.datos-oportunidad-editorial dd { margin: 0; font-weight: 650; }
.enlaces-oportunidad-editorial { display: grid; gap: .3rem; }
.enlaces-oportunidad-editorial a, .estado-propuesta-oportunidad a { width: fit-content; color: #087bc6; text-decoration: none; font-weight: 650; }
.enlaces-oportunidad-editorial a:hover, .estado-propuesta-oportunidad a:hover { text-decoration: underline; }
.estado-propuesta-oportunidad { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .6rem; padding-top: .7rem; border-top: 1px solid var(--borde-panel, #e2e8f0); }
.estado-propuesta-oportunidad a { display: inline-flex; align-items: center; gap: .35rem; }
.estado-propuesta-oportunidad svg { width: 1rem; height: 1rem; }
.aviso-evaluacion-pendiente { margin: 0; padding: .7rem; border-radius: .6rem; background: #fff7e6; color: #8a4b00; }
@media (max-width: 740px) {
  .cabecera-oportunidades-editoriales { flex-direction: column; }
  .datos-oportunidad-editorial { display: grid; }
  .tarjeta-oportunidad-editorial { padding: .85rem; }
}
</style>
