<script setup lang="ts">
import { Save, X } from '@lucide/vue'
import type {
  MedioEditorial,
  MetadatosMedioEditorial
} from '~/types/mediaEditorial'

const props = defineProps<{
  medio: MedioEditorial
}>()

const emit = defineEmits<{
  cerrar: []
  actualizado: [medio: MedioEditorial]
}>()

const { ejecutarConBloqueo } = useBloqueoInterfaz()
const guardando = ref(false)
const errorFormulario = ref('')
const formulario = reactive<MetadatosMedioEditorial>({
  titulo: props.medio.titulo,
  textoAlternativo: props.medio.textoAlternativo,
  esDecorativa: props.medio.esDecorativa,
  pieDeFoto: props.medio.pieDeFoto,
  credito: props.medio.credito,
  urlFuente: props.medio.urlFuente
})

async function guardarMetadatos() {
  if (guardando.value) return

  if (!formulario.esDecorativa && formulario.textoAlternativo.trim().length < 5) {
    errorFormulario.value = 'Describe la imagen o márcala como decorativa.'
    return
  }

  guardando.value = true
  errorFormulario.value = ''

  await ejecutarConBloqueo(
    `editar-medio:${props.medio.id}`,
    'Actualizando metadatos',
    async () => {
      try {
        const medio = await $fetch<MedioEditorial>(
          `/api/admin/media/${props.medio.id}`,
          {
            method: 'PATCH',
            body: formulario
          }
        )
        emit('actualizado', medio)
      } catch (error: unknown) {
        const peticion = error as {
          data?: { statusMessage?: string }
          statusMessage?: string
        }
        errorFormulario.value = peticion.data?.statusMessage
          || peticion.statusMessage
          || 'No se pudieron guardar los metadatos.'
      } finally {
        guardando.value = false
      }
    }
  )
}
</script>

<template>
  <div
    class="fondo-modal-editorial"
    role="presentation"
    @mousedown.self="emit('cerrar')"
  >
    <section
      class="modal-editorial modal-editar-medio"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-medio"
    >
      <header class="cabecera-modal-editorial">
        <div>
          <p class="etiqueta-panel">Metadatos</p>
          <h2 id="titulo-editar-medio">Editar imagen</h2>
          <span>{{ medio.ancho }} × {{ medio.alto }} px</span>
        </div>
        <button
          type="button"
          title="Cerrar"
          aria-label="Cerrar edición de imagen"
          @click="emit('cerrar')"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div class="resumen-imagen-edicion">
        <img
          :src="medio.urlPublica"
          :alt="medio.esDecorativa ? '' : medio.textoAlternativo"
        >
      </div>

      <form class="formulario-medio-editorial" @submit.prevent="guardarMetadatos">
        <div class="rejilla-formulario-medio">
          <label class="campo-ancho-completo">
            Título interno
            <input
              v-model="formulario.titulo"
              type="text"
              minlength="2"
              maxlength="160"
              required
            >
          </label>
          <label class="campo-ancho-completo">
            Texto alternativo
            <textarea
              v-model="formulario.textoAlternativo"
              rows="2"
              maxlength="240"
              :disabled="formulario.esDecorativa"
              :required="!formulario.esDecorativa"
            />
          </label>
          <label class="opcion-decorativa-medio campo-ancho-completo">
            <input v-model="formulario.esDecorativa" type="checkbox">
            <span>
              <strong>La imagen es decorativa</strong>
              <small>El texto alternativo quedará vacío.</small>
            </span>
          </label>
          <label>
            Crédito
            <input v-model="formulario.credito" type="text" maxlength="300">
          </label>
          <label>
            URL de la fuente
            <input v-model="formulario.urlFuente" type="url" maxlength="2048">
          </label>
          <label class="campo-ancho-completo">
            Pie de foto
            <textarea
              v-model="formulario.pieDeFoto"
              rows="2"
              maxlength="500"
            />
          </label>
        </div>

        <p v-if="errorFormulario" class="aviso-error-editorial" role="alert">
          {{ errorFormulario }}
        </p>

        <footer class="acciones-modal-editorial">
          <button
            class="boton-editorial-secundario"
            type="button"
            :disabled="guardando"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            class="boton-editorial-principal"
            type="submit"
            :disabled="guardando"
          >
            <Save aria-hidden="true" />
            Guardar metadatos
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
