<script setup lang="ts">
import {
  CheckCircle2,
  Link2,
  LoaderCircle,
  ShieldCheck
} from '@lucide/vue'
import PanelModal from '~/components/admin/ui/PanelModal.vue'
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
  <PanelModal
    abierto
    titulo="Registrar una fuente"
    descripcion="Pega el enlace y deja preparado el enfoque para extraer evidencia verificable."
    ancho="md"
    :bloqueado="guardando"
    @cerrar="emit('cerrar')"
  >
    <form id="formulario-nueva-ingesta" class="formulario-nueva-ingesta-modal" @submit.prevent="registrar">
      <label class="campo-modal">
        <span>Enlace de la fuente</span>
        <div class="campo-con-icono">
          <Link2 aria-hidden="true" />
          <input
            v-model="formulario.urlFuente"
            type="url"
            maxlength="2048"
            inputmode="url"
            autocomplete="url"
            placeholder="https://tiktok.com/..."
            required
            data-foco-inicial
          >
        </div>
        <small>Admite páginas web, YouTube, TikTok, Instagram, X y Facebook.</small>
      </label>

      <div class="rejilla-modal">
        <label class="campo-modal">
          <span>Título de referencia <em>Opcional</em></span>
          <input v-model="formulario.tituloSugerido" class="campo-panel" type="text" maxlength="160" placeholder="Cómo reconocer esta historia">
        </label>

        <label class="campo-modal">
          <span>Tipo esperado</span>
          <select v-model="formulario.reglas.tipoContenido" class="campo-panel">
            <option value="auto">Decidir durante el procesamiento</option>
            <option v-for="tipo in tiposContenidoEditorial" :key="tipo" :value="tipo">{{ etiquetasTipoContenido[tipo] }}</option>
          </select>
        </label>

        <label class="campo-modal">
          <span>Sección sugerida</span>
          <select v-model="formulario.categoriaId" class="campo-panel">
            <option :value="null">Sin definir</option>
            <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">{{ categoria.nombre }}</option>
          </select>
        </label>
      </div>

      <label class="campo-modal">
        <span>Instrucciones editoriales <em>Opcional</em> · {{ formulario.instrucciones.length }}/1000</span>
        <textarea
          v-model="formulario.instrucciones"
          class="campo-panel campo-area"
          maxlength="1000"
          rows="3"
          placeholder="Ángulo, hechos que deben verificarse o contexto que no se debe perder."
        />
      </label>

      <fieldset class="reglas-modal">
        <legend>Reglas de salida</legend>
        <label>
          <input v-model="formulario.reglas.exigirCreditos" type="checkbox">
          <span><strong>Créditos obligatorios</strong><small>La propuesta deberá conservar fuente y autoría.</small></span>
        </label>
        <label>
          <input v-model="formulario.reglas.generarSeo" type="checkbox">
          <span><strong>Propuesta SEO</strong><small>Queda como intención editorial para la etapa de redacción.</small></span>
        </label>
        <label>
          <input v-model="formulario.reglas.conservarVideo" type="checkbox">
          <span><strong>Conservar video</strong><small>HU-ED-07 solo conserva metadatos, transcripción y traducción.</small></span>
        </label>
      </fieldset>

      <p class="nota-modal"><ShieldCheck aria-hidden="true" /> Registrar una fuente no la publica. Esta fase deja evidencia lista para revisión.</p>
      <p v-if="error" class="aviso-panel aviso-panel--alerta" role="alert">{{ error }}</p>
    </form>

    <template #pie>
      <button class="boton-panel" type="button" :disabled="guardando" @click="emit('cerrar')">Cancelar</button>
      <button class="boton-panel boton-panel--marca" type="submit" form="formulario-nueva-ingesta" :disabled="!formularioValido || guardando">
        <LoaderCircle v-if="guardando" class="icono-girando" aria-hidden="true" />
        <CheckCircle2 v-else aria-hidden="true" />
        <span>{{ guardando ? 'Registrando...' : 'Registrar fuente' }}</span>
      </button>
    </template>
  </PanelModal>
</template>

<style scoped>
.formulario-nueva-ingesta-modal { display: grid; gap: 14px; }
.campo-modal { display: grid; gap: 5px; color: #4d5b73; font-size: 0.76rem; font-weight: 750; }
.campo-modal em { font-style: normal; font-weight: 600; opacity: 0.8; }
.campo-modal small { font-weight: 600; }
.campo-con-icono { display: flex; align-items: center; gap: 8px; min-height: 38px; border: 1px solid #c3cfdf; border-radius: 7px; padding: 0 10px; }
.campo-con-icono:focus-within { border-color: #1d6fd1; box-shadow: 0 0 0 3px rgba(29, 111, 209, 0.18); }
.campo-con-icono svg { width: 16px; height: 16px; color: #4d5b73; }
.campo-con-icono input { min-width: 0; flex: 1; border: 0; outline: 0; font: inherit; font-size: 0.9rem; color: #0e1b33; }
.rejilla-modal { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.campo-area { height: auto; min-height: 76px; padding: 8px 10px; resize: vertical; }
.reglas-modal { display: grid; gap: 8px; margin: 0; border: 1px solid #dde4ee; border-radius: 10px; padding: 10px 12px; }
.reglas-modal legend { padding: 0 6px; color: #4d5b73; font-size: 0.76rem; font-weight: 800; }
.reglas-modal label { display: flex; align-items: flex-start; gap: 10px; color: #0e1b33; font-size: 0.86rem; }
.reglas-modal input { margin-top: 3px; width: 16px; height: 16px; }
.reglas-modal span { display: grid; gap: 1px; }
.reglas-modal small { color: #4d5b73; font-size: 0.76rem; font-weight: 500; }
.nota-modal { display: flex; align-items: center; gap: 8px; margin: 0; color: #4d5b73; font-size: 0.8rem; }
.nota-modal svg { width: 16px; height: 16px; flex: 0 0 auto; color: #146c3a; }
</style>
