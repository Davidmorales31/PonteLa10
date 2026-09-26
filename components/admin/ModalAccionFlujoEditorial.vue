<script setup lang="ts">
import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  PencilLine,
  Rocket,
  Send,
  ShieldCheck,
  Undo2,
  X
} from '@lucide/vue'
import type {
  AccionFlujoEditorial,
  EntradaTransicionEditorial
} from '~/types/contenidoEditorial'
import { fechaParaCampoLocal } from '~/utils/editorial/fechaProgramacion'

const props = defineProps<{
  accion: AccionFlujoEditorial
  versionBloqueo: number
  programadoPara?: string | null
  nivelAal?: 'aal1' | 'aal2'
  retorno: string
}>()

const emit = defineEmits<{
  cerrar: []
  confirmar: [entrada: EntradaTransicionEditorial]
}>()

const nota = ref('')
const aplicarConIa = ref(false)
const confirmarProgramacionAutomatica = ref(false)
const fechaProgramacion = ref(
  props.programadoPara
    ? fechaParaCampoLocal(new Date(props.programadoPara))
    : ''
)

const iconosAcciones = {
  enviarRevision: Send,
  solicitarCambios: Undo2,
  aprobar: BadgeCheck,
  aprobarYProgramar: CalendarClock,
  programar: CalendarClock,
  publicar: Rocket,
  cancelarProgramacion: Undo2,
  crearRevision: PencilLine,
  archivar: Undo2,
  reabrir: PencilLine
}

const fechaMinimaProgramacion = computed(() => {
  const fecha = new Date(Date.now() + 5 * 60 * 1000)
  fecha.setSeconds(0, 0)
  return fechaParaCampoLocal(fecha)
})

const requiereVerificacion = computed(() =>
  props.accion.requiereMfa && props.nivelAal !== 'aal2'
)

const rutaVerificacion = computed(() => ({
  path: '/admin/seguridad',
  query: {
    motivo: 'mfa',
    retorno: props.retorno
  }
}))

const formularioValido = computed(() => {
  if (props.accion.requiereNota && nota.value.trim().length < 3) return false
  if (
    props.accion.estadoObjetivo === 'changes_requested'
    && nota.value.trim().length < 10
  ) return false
  if (props.accion.requiereProgramacion && !fechaProgramacion.value) return false
  if (props.accion.programacionAutomatica && !confirmarProgramacionAutomatica.value) return false
  return !requiereVerificacion.value
})

function confirmar() {
  if (!formularioValido.value) return

  emit('confirmar', {
    estadoObjetivo: props.accion.estadoObjetivo,
    versionBloqueo: props.versionBloqueo,
    nota: nota.value.trim(),
    programadoPara: props.accion.requiereProgramacion
      ? new Date(fechaProgramacion.value).toISOString()
      : null,
    aplicarConIa: props.accion.estadoObjetivo === 'changes_requested'
      && aplicarConIa.value,
    confirmacionAutomatica: props.accion.programacionAutomatica
      && confirmarProgramacionAutomatica.value
  })
}
</script>

<template>
  <div
    class="fondo-modal-editorial"
    role="presentation"
    @mousedown.self="emit('cerrar')"
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
          <h2 id="titulo-transicion-editorial">{{ accion.etiqueta }}</h2>
          <span>{{ accion.descripcion }}</span>
        </div>
        <button
          type="button"
          title="Cerrar"
          aria-label="Cerrar decisión editorial"
          @click="emit('cerrar')"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <form class="formulario-transicion-editorial" @submit.prevent="confirmar">
        <label v-if="accion.requiereProgramacion">
          Fecha y hora de publicación
          <input
            v-model="fechaProgramacion"
            type="datetime-local"
            :min="fechaMinimaProgramacion"
            required
          >
        </label>

        <div v-if="accion.programacionAutomatica" class="aviso-programacion-automatica-editorial">
          <CalendarClock aria-hidden="true" />
          <p>
            La aprobación y la reserva se realizarán juntas. El sistema asignará
            el siguiente espacio libre, en intervalos configurados de una hora
            y horario de Colombia (America/Bogota).
          </p>
          <label>
            <input v-model="confirmarProgramacionAutomatica" type="checkbox">
            Confirmo aprobar este contenido y programar su publicación.
          </label>
        </div>

        <label>
          Nota editorial
          <textarea
            v-model="nota"
            rows="4"
            maxlength="1000"
            :required="accion.requiereNota"
            :placeholder="accion.requiereNota
              ? 'Explica el motivo de esta decisión'
              : 'Contexto opcional para el historial'"
          />
        </label>

        <label
          v-if="accion.estadoObjetivo === 'changes_requested'"
          class="opcion-ia-cambios-editorial"
        >
          <input v-model="aplicarConIa" type="checkbox">
          <span>
            Aplicar estos cambios con IA
            <small>DeepSeek editará el borrador una vez. Después podrás revisarlo y aprobarlo tú.</small>
          </span>
        </label>

        <aside v-if="requiereVerificacion" class="aviso-mfa-accion-editorial">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Verifica tu sesión para continuar</strong>
            <p>
              Esta decisión editorial requiere el código de tu autenticador.
              Volverás a esta noticia al terminar.
            </p>
          </div>
          <NuxtLink :to="rutaVerificacion">
            Verificar sesión
          </NuxtLink>
        </aside>

        <footer class="acciones-modal-editorial">
          <button
            class="boton-editorial-secundario"
            type="button"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            class="boton-editorial-principal"
            type="submit"
            :disabled="!formularioValido"
          >
            <Clock3 v-if="accion.requiereProgramacion" aria-hidden="true" />
            <component
              :is="iconosAcciones[accion.id]"
              v-else
              aria-hidden="true"
            />
            Confirmar {{ accion.etiqueta.toLocaleLowerCase('es') }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
