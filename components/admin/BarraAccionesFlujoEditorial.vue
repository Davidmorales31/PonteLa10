<script setup lang="ts">
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Circle,
  PencilLine,
  Rocket,
  Send,
  Undo2
} from '@lucide/vue'
import type {
  AccionFlujoEditorial,
  EstadoContenidoEditorial,
  FlujoArticuloEditorial,
  IdAccionFlujoEditorial
} from '~/types/contenidoEditorial'
import { etiquetasEstadoContenido } from '~/utils/editorial/contenido'

const props = defineProps<{
  flujo: FlujoArticuloEditorial
  bloqueado?: boolean
  motivosBloqueo?: Partial<Record<IdAccionFlujoEditorial, string>>
}>()

const emit = defineEmits<{
  seleccionar: [accion: AccionFlujoEditorial]
}>()

const iconosAcciones = {
  enviarRevision: Send,
  solicitarCambios: Undo2,
  aprobar: BadgeCheck,
  programar: CalendarClock,
  publicar: Rocket,
  cancelarProgramacion: Undo2,
  crearRevision: PencilLine,
  archivar: Circle,
  reabrir: PencilLine
}

const ordenAcciones: AccionFlujoEditorial['id'][] = [
  'aprobar',
  'publicar',
  'enviarRevision',
  'programar',
  'solicitarCambios',
  'cancelarProgramacion',
  'crearRevision',
  'reabrir'
]

const accionesVisibles = computed(() => props.flujo.acciones
  .filter(accion => accion.id !== 'archivar')
  .sort((primera, segunda) =>
    ordenAcciones.indexOf(primera.id) - ordenAcciones.indexOf(segunda.id)
  ))

const avisosBloqueo = computed(() => [...new Set(
  accionesVisibles.value
    .map(accion => props.motivosBloqueo?.[accion.id])
    .filter((motivo): motivo is string => Boolean(motivo))
)])

const accionesPrincipales = new Set<AccionFlujoEditorial['id']>([
  'enviarRevision',
  'aprobar',
  'publicar',
  'crearRevision',
  'reabrir'
])

const pasosFlujo = [
  { id: 'preparacion', etiqueta: 'Preparación' },
  { id: 'revision', etiqueta: 'Revisión' },
  { id: 'aprobacion', etiqueta: 'Aprobación' },
  { id: 'publicacion', etiqueta: 'Publicación' }
] as const

function indiceEstado(estado: EstadoContenidoEditorial): number {
  if (estado === 'review') return 1
  if (estado === 'approved' || estado === 'scheduled') return 2
  if (estado === 'published') return 3
  return 0
}

const indiceActual = computed(() => indiceEstado(props.flujo.estado))

const mensajeEstado = computed(() => {
  if (props.bloqueado) {
    return 'Guarda los cambios pendientes para habilitar las decisiones editoriales.'
  }

  const mensajes: Record<EstadoContenidoEditorial, string> = {
    draft: 'Completa el contenido y envíalo a revisión.',
    changes_requested: 'Aplica los ajustes y vuelve a enviarlo a revisión.',
    review: 'La noticia está lista para aprobarse o devolverla con cambios.',
    approved: 'La noticia ya está aprobada; puedes publicarla o programarla.',
    scheduled: 'La publicación está programada y todavía puedes publicarla ahora.',
    published: 'La noticia está visible en el sitio público.',
    archived: 'El contenido está archivado y puede reabrirse.'
  }

  return mensajes[props.flujo.estado]
})
</script>

<template>
  <section class="barra-acciones-flujo" aria-labelledby="titulo-acciones-flujo">
    <div class="resumen-acciones-flujo">
      <span class="estado-contenido" :data-estado="flujo.estado">
        {{ etiquetasEstadoContenido[flujo.estado] }}
      </span>
      <div>
        <h2 id="titulo-acciones-flujo">Siguiente decisión editorial</h2>
        <p>{{ mensajeEstado }}</p>
      </div>
    </div>

    <ol class="progreso-publicacion-editor" aria-label="Progreso de publicación">
      <li
        v-for="(paso, indice) in pasosFlujo"
        :key="paso.id"
        :class="{
          actual: indice === indiceActual,
          completado: indice < indiceActual
        }"
      >
        <Check v-if="indice < indiceActual" aria-hidden="true" />
        <Circle v-else aria-hidden="true" />
        <span>{{ paso.etiqueta }}</span>
      </li>
    </ol>

    <div v-if="accionesVisibles.length" class="botones-acciones-flujo">
      <button
        v-for="accion in accionesVisibles"
        :key="accion.id"
        :class="accionesPrincipales.has(accion.id)
          ? 'boton-editorial-principal'
          : 'boton-editorial-secundario'"
        type="button"
        :disabled="bloqueado || Boolean(motivosBloqueo?.[accion.id])"
        :title="motivosBloqueo?.[accion.id] || accion.descripcion"
        @click="emit('seleccionar', accion)"
      >
        <component :is="iconosAcciones[accion.id]" aria-hidden="true" />
        <span>{{ accion.etiqueta }}</span>
      </button>
    </div>

    <ul v-if="avisosBloqueo.length" class="requisitos-acciones-flujo">
      <li v-for="aviso in avisosBloqueo" :key="aviso">{{ aviso }}</li>
    </ul>
  </section>
</template>
