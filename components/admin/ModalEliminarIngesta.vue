<script setup lang="ts">
import { AlertTriangle, ShieldCheck, Trash2, X } from '@lucide/vue'
import type { IngestaEditorial, ResultadoEliminacionIngestaEditorial } from '~/types/ingestaEditorial'

const props = defineProps<{
  ingesta: Pick<IngestaEditorial, 'id' | 'hostFuente' | 'tituloSugerido' | 'estado' | 'articuloId'>
  nivelAal?: 'aal1' | 'aal2' | null
  retorno: string
}>()

const emit = defineEmits<{
  cerrar: []
  eliminada: [resultado: ResultadoEliminacionIngestaEditorial]
}>()

const { ejecutarConBloqueo } = useBloqueoInterfaz()
const { mostrarAlerta } = useAlertasEditoriales()
const confirmacion = ref('')
const eliminando = ref(false)
const sesionVerificada = computed(() => props.nivelAal === 'aal2')
const estaProcesando = computed(() => props.ingesta.estado === 'processing')
const tieneBorradorAutomatico = computed(() => props.ingesta.estado === 'draft_created' && Boolean(props.ingesta.articuloId))
const puedeEliminar = computed(() => (
  confirmacion.value === 'ELIMINAR' && sesionVerificada.value && !eliminando.value && !estaProcesando.value
))
const identificador = computed(() => props.ingesta.tituloSugerido || props.ingesta.hostFuente)
const rutaVerificacion = computed(() => ({
  path: '/admin/seguridad',
  query: { motivo: 'mfa', retorno: props.retorno }
}))

function mensajeError(errorPeticion: unknown): string {
  const error = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
  return error.data?.statusMessage || error.statusMessage || 'No se pudo eliminar la ingesta.'
}

async function eliminarIngesta() {
  if (!puedeEliminar.value) return
  eliminando.value = true

  await ejecutarConBloqueo(
    `eliminar-ingesta:${props.ingesta.id}`,
    'Eliminando ingesta fallida',
    async () => {
      try {
        const resultado = await $fetch<ResultadoEliminacionIngestaEditorial>(
          `/api/admin/ingestas/${props.ingesta.id}`,
          { method: 'DELETE', body: { confirmacion: confirmacion.value } }
        )
        emit('eliminada', resultado)
      } catch (errorPeticion) {
        mostrarAlerta({
          tipo: 'error',
          titulo: 'No se eliminó la ingesta',
          mensaje: mensajeError(errorPeticion)
        })
      } finally {
        eliminando.value = false
      }
    }
  )
}
</script>

<template>
  <div class="fondo-modal-editorial" role="presentation" @mousedown.self="emit('cerrar')">
    <section
      class="modal-editorial modal-eliminar-ingesta"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-eliminar-ingesta"
      aria-describedby="detalle-eliminar-ingesta"
    >
      <header class="cabecera-modal-editorial">
        <div>
          <p class="etiqueta-panel etiqueta-peligro">Acción irreversible</p>
          <h2 id="titulo-eliminar-ingesta">Eliminar ingesta</h2>
          <span>{{ identificador }}</span>
        </div>
        <button type="button" title="Cerrar" aria-label="Cerrar eliminación" @click="emit('cerrar')">
          <X aria-hidden="true" />
        </button>
      </header>

      <form class="formulario-eliminar-ingesta" @submit.prevent="eliminarIngesta">
        <aside id="detalle-eliminar-ingesta" class="advertencia-eliminar-ingesta">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Esta eliminación es definitiva</strong>
            <p v-if="estaProcesando">Esta ingesta está usando un worker. Espera a que termine para evitar cortar el proceso o consumir una llamada innecesaria.</p>
            <p v-else-if="tieneBorradorAutomatico">Se borrarán la ingesta, su historial técnico y el borrador automático asociado. No afecta artículos publicados.</p>
            <p v-else>Se borrarán la ingesta y su historial técnico, incluso si tiene evidencia lista. No afecta artículos publicados.</p>
          </div>
        </aside>

        <label>
          Escribe <strong>ELIMINAR</strong> para confirmar
          <input v-model="confirmacion" type="text" maxlength="8" autocomplete="off" spellcheck="false">
        </label>

        <aside v-if="!sesionVerificada" class="aviso-mfa-accion-editorial">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Verificación reforzada requerida</strong>
            <p>La eliminación definitiva exige MFA.</p>
          </div>
          <NuxtLink :to="rutaVerificacion">Verificar sesión</NuxtLink>
        </aside>

        <footer class="acciones-modal-editorial">
          <button class="boton-editorial-secundario" type="button" :disabled="eliminando" @click="emit('cerrar')">Cancelar</button>
          <button class="boton-eliminar-definitivo" type="submit" :disabled="!puedeEliminar">
            <Trash2 aria-hidden="true" />
            Eliminar definitivamente
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
