<script setup lang="ts">
import {
  ImagePlus,
  LoaderCircle,
  Upload,
  X
} from '@lucide/vue'
import type { MedioEditorial } from '~/types/mediaEditorial'
import {
  crearTituloDesdeArchivo,
  limiteBytesImagenEditorial,
  tiposImagenEditorialPermitidos
} from '~/utils/media/editorial'

const emit = defineEmits<{
  cerrar: []
  subido: [medio: MedioEditorial]
}>()

const { ejecutarConBloqueo } = useBloqueoInterfaz()
const archivo = ref<File | null>(null)
const urlPrevia = ref('')
const inputArchivo = ref<HTMLInputElement | null>(null)
const enviando = ref(false)
const arrastrando = ref(false)
const errorFormulario = ref('')
const formulario = reactive({
  titulo: '',
  textoAlternativo: '',
  esDecorativa: false,
  pieDeFoto: '',
  credito: '',
  urlFuente: ''
})

function limpiarPrevia() {
  if (urlPrevia.value) URL.revokeObjectURL(urlPrevia.value)
  urlPrevia.value = ''
}

function seleccionarArchivo(nuevoArchivo: File | null) {
  errorFormulario.value = ''

  if (!nuevoArchivo) return

  if (!tiposImagenEditorialPermitidos.includes(
    nuevoArchivo.type as typeof tiposImagenEditorialPermitidos[number]
  )) {
    errorFormulario.value = 'Usa una imagen JPG, PNG o WebP.'
    return
  }

  if (nuevoArchivo.size > limiteBytesImagenEditorial) {
    errorFormulario.value = 'La imagen no puede superar 12 MB.'
    return
  }

  limpiarPrevia()
  archivo.value = nuevoArchivo
  urlPrevia.value = URL.createObjectURL(nuevoArchivo)

  if (!formulario.titulo) {
    formulario.titulo = crearTituloDesdeArchivo(nuevoArchivo.name)
  }
}

function manejarArchivo(evento: Event) {
  seleccionarArchivo(
    (evento.target as HTMLInputElement).files?.[0] || null
  )
}

function soltarArchivo(evento: DragEvent) {
  arrastrando.value = false
  seleccionarArchivo(evento.dataTransfer?.files?.[0] || null)
}

async function subirMedio() {
  if (!archivo.value || enviando.value) {
    errorFormulario.value = 'Selecciona una imagen antes de continuar.'
    return
  }

  if (!formulario.esDecorativa && formulario.textoAlternativo.trim().length < 5) {
    errorFormulario.value = 'Describe la imagen o márcala como decorativa.'
    return
  }

  enviando.value = true
  errorFormulario.value = ''

  await ejecutarConBloqueo(
    'subir-medio-editorial',
    'Optimizando y guardando imagen',
    async () => {
      try {
        const cuerpo = new FormData()
        cuerpo.append('archivo', archivo.value!)
        cuerpo.append('metadatos', JSON.stringify(formulario))
        const medio = await $fetch<MedioEditorial>('/api/admin/media', {
          method: 'POST',
          body: cuerpo
        })
        emit('subido', medio)
      } catch (error: unknown) {
        const peticion = error as {
          data?: { statusMessage?: string }
          statusMessage?: string
        }
        errorFormulario.value = peticion.data?.statusMessage
          || peticion.statusMessage
          || 'No se pudo subir la imagen.'
      } finally {
        enviando.value = false
      }
    }
  )
}

onBeforeUnmount(limpiarPrevia)
</script>

<template>
  <div
    class="fondo-modal-editorial"
    role="presentation"
    @mousedown.self="emit('cerrar')"
  >
    <section
      class="modal-editorial modal-subir-medio"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-subir-medio"
    >
      <header class="cabecera-modal-editorial">
        <div>
          <p class="etiqueta-panel">Biblioteca multimedia</p>
          <h2 id="titulo-subir-medio">Subir imagen</h2>
          <span>Se convertirá a WebP y se optimizará automáticamente.</span>
        </div>
        <button
          type="button"
          title="Cerrar"
          aria-label="Cerrar carga de imagen"
          @click="emit('cerrar')"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <form class="formulario-medio-editorial" @submit.prevent="subirMedio">
        <button
          class="zona-carga-medio"
          :class="{ arrastrando, 'con-imagen': urlPrevia }"
          type="button"
          @click="inputArchivo?.click()"
          @dragenter.prevent="arrastrando = true"
          @dragover.prevent
          @dragleave.prevent="arrastrando = false"
          @drop.prevent="soltarArchivo"
        >
          <img v-if="urlPrevia" :src="urlPrevia" alt="">
          <template v-else>
            <ImagePlus aria-hidden="true" />
            <strong>Arrastra una imagen o selecciónala</strong>
            <span>JPG, PNG o WebP · máximo 12 MB</span>
          </template>
        </button>
        <input
          ref="inputArchivo"
          class="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="manejarArchivo"
        >

        <div class="rejilla-formulario-medio">
          <label class="campo-ancho-completo">
            Título interno
            <input
              v-model="formulario.titulo"
              type="text"
              minlength="2"
              maxlength="160"
              required
              placeholder="Identifica la imagen en la biblioteca"
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
              placeholder="Describe lo importante que aparece en la imagen"
            />
          </label>

          <label class="opcion-decorativa-medio campo-ancho-completo">
            <input v-model="formulario.esDecorativa" type="checkbox">
            <span>
              <strong>La imagen es decorativa</strong>
              <small>No transmite información necesaria para comprender el contenido.</small>
            </span>
          </label>

          <label>
            Crédito
            <input
              v-model="formulario.credito"
              type="text"
              maxlength="300"
              placeholder="Fotógrafo, agencia o medio"
            >
          </label>
          <label>
            URL de la fuente
            <input
              v-model="formulario.urlFuente"
              type="url"
              maxlength="2048"
              placeholder="https://"
            >
          </label>
          <label class="campo-ancho-completo">
            Pie de foto
            <textarea
              v-model="formulario.pieDeFoto"
              rows="2"
              maxlength="500"
              placeholder="Contexto visible bajo la imagen"
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
            :disabled="enviando"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            class="boton-editorial-principal"
            type="submit"
            :disabled="enviando || !archivo"
          >
            <LoaderCircle v-if="enviando" class="icono-girando" aria-hidden="true" />
            <Upload v-else aria-hidden="true" />
            {{ enviando ? 'Procesando' : 'Subir imagen' }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
