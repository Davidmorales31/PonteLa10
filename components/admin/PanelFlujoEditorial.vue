<script setup lang="ts">
import {
  Archive,
  BadgeCheck,
  CalendarClock,
  MessageSquare,
  PencilLine,
  Rocket,
  Send,
  ShieldCheck,
  Undo2
} from '@lucide/vue'
import type {
  AccionFlujoEditorial,
  FlujoArticuloEditorial,
  IdAccionFlujoEditorial
} from '~/types/contenidoEditorial'
import { etiquetasEstadoContenido } from '~/utils/editorial/contenido'

defineProps<{
  flujo: FlujoArticuloEditorial
  bloqueado?: boolean
  motivosBloqueo?: Partial<Record<IdAccionFlujoEditorial, string>>
}>()

const emit = defineEmits<{
  comentar: [mensaje: string]
  seleccionarAccion: [accion: AccionFlujoEditorial]
}>()

const comentario = ref('')

const iconosAcciones = {
  enviarRevision: Send,
  solicitarCambios: Undo2,
  aprobar: BadgeCheck,
  programar: CalendarClock,
  publicar: Rocket,
  cancelarProgramacion: Undo2,
  crearRevision: PencilLine,
  archivar: Archive,
  reabrir: PencilLine
}

function enviarComentario() {
  const mensaje = comentario.value.trim()
  if (mensaje.length < 3) return
  emit('comentar', mensaje)
  comentario.value = ''
}

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}
</script>

<template>
  <section class="panel-configuracion-editor panel-flujo-editorial">
    <header>
      <div>
        <p class="etiqueta-panel">Control editorial</p>
        <h2>Flujo de publicación</h2>
      </div>
      <ShieldCheck aria-hidden="true" />
    </header>

    <div class="resumen-estado-flujo">
      <span class="estado-contenido" :data-estado="flujo.estado">
        {{ etiquetasEstadoContenido[flujo.estado] }}
      </span>
      <span v-if="flujo.tieneVersionPublica" class="version-publica-activa">
        <span aria-hidden="true" />
        Versión pública activa
      </span>
    </div>

    <p v-if="flujo.programadoPara" class="fecha-programacion-flujo">
      <CalendarClock aria-hidden="true" />
      Publicación: {{ formatearFecha(flujo.programadoPara) }}
    </p>

    <div v-if="flujo.acciones.length" class="acciones-flujo-editorial">
      <button
        v-for="accion in flujo.acciones"
        :key="accion.id"
        type="button"
        :disabled="bloqueado || Boolean(motivosBloqueo?.[accion.id])"
        :title="motivosBloqueo?.[accion.id] || accion.descripcion"
        @click="emit('seleccionarAccion', accion)"
      >
        <component :is="iconosAcciones[accion.id]" aria-hidden="true" />
        <span>
          <strong>{{ accion.etiqueta }}</strong>
          <small>{{ accion.descripcion }}</small>
        </span>
      </button>
    </div>

    <p v-if="bloqueado" class="aviso-acciones-flujo-bloqueadas" role="status">
      Guarda los cambios pendientes para habilitar estas decisiones.
    </p>

    <p v-else class="texto-secundario-editor">
      No hay acciones disponibles para tu rol en este estado.
    </p>

    <div class="conversacion-revision-editorial">
      <header>
        <h3>Conversación</h3>
        <MessageSquare aria-hidden="true" />
      </header>

      <ol v-if="flujo.comentarios.length">
        <li v-for="item in flujo.comentarios" :key="item.id" :data-tipo="item.tipo">
          <div>
            <strong>{{ item.autorNombre }}</strong>
            <time :datetime="item.creadoEn">{{ formatearFecha(item.creadoEn) }}</time>
          </div>
          <p>{{ item.mensaje }}</p>
        </li>
      </ol>
      <p v-else class="texto-secundario-editor">Todavía no hay observaciones.</p>

      <form @submit.prevent="enviarComentario">
        <label for="comentario-revision">Agregar comentario</label>
        <textarea
          id="comentario-revision"
          v-model="comentario"
          rows="3"
          maxlength="1000"
          placeholder="Deja contexto para el equipo editorial"
        />
        <button
          class="boton-editorial-secundario"
          type="submit"
          :disabled="comentario.trim().length < 3 || bloqueado"
        >
          <MessageSquare aria-hidden="true" />
          Comentar
        </button>
      </form>
    </div>

  </section>
</template>
