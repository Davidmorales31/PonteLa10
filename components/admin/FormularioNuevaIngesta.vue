<script setup lang="ts">
import {
  CheckCircle2,
  FileInput,
  Link2,
  LoaderCircle,
  ShieldCheck,
  X
} from '@lucide/vue'
import type {
  CategoriaEditorial,
} from '~/types/contenidoEditorial'
import type { EntradaCrearIngestaEditorial } from '~/types/ingestaEditorial'
import {
  etiquetasTipoContenido,
  tiposContenidoEditorial
} from '~/utils/editorial/contenido'

const props = defineProps<{
  categorias: CategoriaEditorial[]
  guardando: boolean
  error: string
}>()

const emit = defineEmits<{
  cerrar: []
  registrar: [entrada: EntradaCrearIngestaEditorial]
}>()

const formulario = reactive<EntradaCrearIngestaEditorial>({
  urlFuente: '',
  tituloSugerido: '',
  instrucciones: '',
  categoriaId: null,
  reglas: {
    tipoContenido: 'auto',
    conservarVideo: true,
    exigirCreditos: true,
    generarSeo: true,
    idioma: 'es-CO'
  }
})

const formularioValido = computed(() => {
  try {
    const url = new URL(formulario.urlFuente.trim())
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
})

function registrar() {
  if (!formularioValido.value || props.guardando) return
  emit('registrar', {
    ...formulario,
    urlFuente: formulario.urlFuente.trim(),
    tituloSugerido: formulario.tituloSugerido.trim(),
    instrucciones: formulario.instrucciones.trim(),
    reglas: { ...formulario.reglas }
  })
}
</script>

<template>
  <section class="panel-nueva-ingesta" aria-labelledby="titulo-nueva-ingesta">
    <header>
      <div class="identidad-nueva-ingesta">
        <span><FileInput aria-hidden="true" /></span>
        <div>
          <p class="etiqueta-panel">Nueva solicitud</p>
          <h2 id="titulo-nueva-ingesta">Registrar una fuente</h2>
          <p>Pega el enlace y deja preparado el enfoque que deberá seguir el procesamiento.</p>
        </div>
      </div>
      <button
        class="boton-icono-editorial"
        type="button"
        aria-label="Cerrar formulario"
        title="Cerrar formulario"
        :disabled="guardando"
        @click="emit('cerrar')"
      >
        <X aria-hidden="true" />
      </button>
    </header>

    <form class="formulario-nueva-ingesta" @submit.prevent="registrar">
      <label class="campo-url-ingesta">
        <span>Enlace de la fuente</span>
        <div>
          <Link2 aria-hidden="true" />
          <input
            v-model="formulario.urlFuente"
            type="url"
            maxlength="2048"
            inputmode="url"
            autocomplete="url"
            placeholder="https://tiktok.com/..."
            required
            autofocus
          >
        </div>
        <small>Admite páginas web, YouTube, TikTok, Instagram, X y Facebook.</small>
      </label>

      <div class="rejilla-datos-ingesta">
        <label class="campo-editorial">
          <span>Título de referencia <em>Opcional</em></span>
          <input
            v-model="formulario.tituloSugerido"
            type="text"
            maxlength="160"
            placeholder="Cómo reconocer esta historia"
          >
        </label>

        <label class="campo-editorial">
          <span>Tipo esperado</span>
          <select v-model="formulario.reglas.tipoContenido">
            <option value="auto">Decidir durante el procesamiento</option>
            <option v-for="tipo in tiposContenidoEditorial" :key="tipo" :value="tipo">
              {{ etiquetasTipoContenido[tipo] }}
            </option>
          </select>
        </label>

        <label class="campo-editorial">
          <span>Sección sugerida</span>
          <select v-model="formulario.categoriaId">
            <option :value="null">Sin definir</option>
            <option
              v-for="categoria in categorias"
              :key="categoria.id"
              :value="categoria.id"
            >
              {{ categoria.nombre }}
            </option>
          </select>
        </label>

        <label class="campo-editorial campo-instrucciones-ingesta">
          <span>Instrucciones editoriales <em>Opcional</em></span>
          <textarea
            v-model="formulario.instrucciones"
            maxlength="1000"
            rows="4"
            placeholder="Ángulo, hechos que deben verificarse o contexto que no se debe perder."
          />
          <small>{{ formulario.instrucciones.length }}/1000</small>
        </label>
      </div>

      <fieldset class="reglas-nueva-ingesta">
        <legend>Reglas de salida</legend>
        <label>
          <input v-model="formulario.reglas.exigirCreditos" type="checkbox">
          <span>
            <strong>Créditos obligatorios</strong>
            <small>La propuesta deberá conservar fuente y autoría.</small>
          </span>
        </label>
        <label>
          <input v-model="formulario.reglas.generarSeo" type="checkbox">
          <span>
            <strong>Propuesta SEO</strong>
            <small>Preparará título, descripción y texto social.</small>
          </span>
        </label>
        <label>
          <input v-model="formulario.reglas.conservarVideo" type="checkbox">
          <span>
            <strong>Conservar video</strong>
            <small>Intentará incluir el recurso original cuando sea viable.</small>
          </span>
        </label>
      </fieldset>

      <p class="nota-seguridad-ingesta">
        <ShieldCheck aria-hidden="true" />
        Registrar una fuente no la publica. El resultado siempre llegará como borrador.
      </p>

      <p v-if="error" class="error-formulario-editorial" role="alert">{{ error }}</p>

      <footer>
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
          :disabled="!formularioValido || guardando"
        >
          <LoaderCircle v-if="guardando" class="icono-girando" aria-hidden="true" />
          <CheckCircle2 v-else aria-hidden="true" />
          <span>{{ guardando ? 'Registrando...' : 'Registrar fuente' }}</span>
        </button>
      </footer>
    </form>
  </section>
</template>
