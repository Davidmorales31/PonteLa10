<script setup lang="ts">
import {
  Archive,
  BadgeCheck,
  CalendarClock,
  Clock3,
  MessageSquare,
  PencilLine,
  Rocket,
  Send,
  ShieldCheck,
  Undo2,
  X
} from '@lucide/vue'
import type {
  AccionFlujoEditorial,
  EntradaTransicionEditorial,
  FlujoArticuloEditorial
} from '~/types/contenidoEditorial'
import { etiquetasEstadoContenido } from '~/utils/editorial/contenido'

const props = defineProps<{
  flujo: FlujoArticuloEditorial
  versionBloqueo: number
  bloqueado?: boolean
  nivelAal?: 'aal1' | 'aal2'
}>()

const emit = defineEmits<{
  transicionar: [entrada: EntradaTransicionEditorial]
  comentar: [mensaje: string]
}>()

const accionSeleccionada = ref<AccionFlujoEditorial | null>(null)
const nota = ref('')
const programadoPara = ref('')
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

const fechaMinimaProgramacion = computed(() => {
  const fecha = new Date(Date.now() + 5 * 60 * 1000)
  fecha.setSeconds(0, 0)
  return fecha.toISOString().slice(0, 16)
})

const accionRequiereMfaSinVerificar = computed(() =>
  accionSeleccionada.value?.requiereMfa && props.nivelAal !== 'aal2'
)

const formularioValido = computed(() => {
  const accion = accionSeleccionada.value
  if (!accion) return false
  if (accion.requiereNota && nota.value.trim().length < 3) return false
  if (accion.estadoObjetivo === 'changes_requested' && nota.value.trim().length < 10) {
    return false
  }
  if (accion.requiereProgramacion && !programadoPara.value) return false
  return !accionRequiereMfaSinVerificar.value
})

function abrirAccion(accion: AccionFlujoEditorial) {
  accionSeleccionada.value = accion
  nota.value = ''
  programadoPara.value = props.flujo.programadoPara
    ? new Date(props.flujo.programadoPara).toISOString().slice(0, 16)
    : ''
}

function cerrarAccion() {
  accionSeleccionada.value = null
  nota.value = ''
  programadoPara.value = ''
}

function confirmarAccion() {
  if (!accionSeleccionada.value || !formularioValido.value) return

  emit('transicionar', {
    estadoObjetivo: accionSeleccionada.value.estadoObjetivo,
    versionBloqueo: props.versionBloqueo,
    nota: nota.value.trim(),
    programadoPara: accionSeleccionada.value.requiereProgramacion
      ? new Date(programadoPara.value).toISOString()
      : null
  })
  cerrarAccion()
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
        :disabled="bloqueado"
        @click="abrirAccion(accion)"
      >
        <component :is="iconosAcciones[accion.id]" aria-hidden="true" />
        <span>
          <strong>{{ accion.etiqueta }}</strong>
          <small>{{ accion.descripcion }}</small>
        </span>
      </button>
    </div>

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

    <div
      v-if="accionSeleccionada"
      class="fondo-modal-editorial"
      role="presentation"
      @mousedown.self="cerrarAccion"
    >
      <section
        class="modal-editorial modal-transicion-editorial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-transicion-editorial"
      >
        <header class="cabecera-modal-editorial">
          <div>
            <p class="etiqueta-panel">Flujo editorial</p>
            <h2 id="titulo-transicion-editorial">
              {{ accionSeleccionada.etiqueta }}
            </h2>
            <span>{{ accionSeleccionada.descripcion }}</span>
          </div>
          <button
            type="button"
            title="Cerrar"
            aria-label="Cerrar transición editorial"
            @click="cerrarAccion"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form class="formulario-transicion-editorial" @submit.prevent="confirmarAccion">
          <label v-if="accionSeleccionada.requiereProgramacion">
            Fecha y hora de publicación
            <input
              v-model="programadoPara"
              type="datetime-local"
              :min="fechaMinimaProgramacion"
              required
            >
          </label>

          <label>
            Nota editorial
            <textarea
              v-model="nota"
              rows="4"
              maxlength="1000"
              :required="accionSeleccionada.requiereNota"
              :placeholder="accionSeleccionada.requiereNota
                ? 'Explica el motivo de esta decisión'
                : 'Contexto opcional para el historial'"
            />
          </label>

          <p v-if="accionRequiereMfaSinVerificar" class="aviso-error-editorial">
            Esta acción requiere una sesión verificada con MFA.
          </p>

          <footer class="acciones-modal-editorial">
            <button
              class="boton-editorial-secundario"
              type="button"
              @click="cerrarAccion"
            >
              Cancelar
            </button>
            <button
              class="boton-editorial-principal"
              type="submit"
              :disabled="!formularioValido"
            >
              <Clock3 v-if="accionSeleccionada.requiereProgramacion" aria-hidden="true" />
              <component
                :is="iconosAcciones[accionSeleccionada.id]"
                v-else
                aria-hidden="true"
              />
              Confirmar
            </button>
          </footer>
        </form>
      </section>
    </div>
  </section>
</template>
