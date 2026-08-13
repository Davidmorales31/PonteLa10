<script setup lang="ts">
import { BadgeCheck, Check, FileText, Image, Search } from '@lucide/vue'
import type { PasoEditorEditorial } from '~/types/contenidoEditorial'

defineProps<{
  pasos: PasoEditorEditorial[]
  pasoActual: PasoEditorEditorial['id']
}>()

const emit = defineEmits<{
  seleccionar: [paso: PasoEditorEditorial['id']]
}>()

const iconosPaso = {
  contenido: FileText,
  presentacion: Image,
  seo: Search,
  revision: BadgeCheck
}
</script>

<template>
  <nav class="barra-etapas-editor" aria-label="Etapas del contenido editorial">
    <ol>
      <li
        v-for="(paso, indice) in pasos"
        :key="paso.id"
        :class="{
          activo: pasoActual === paso.id,
          completo: paso.completo
        }"
      >
        <button
          type="button"
          :aria-current="pasoActual === paso.id ? 'step' : undefined"
          @click="emit('seleccionar', paso.id)"
        >
          <span class="icono-paso-editor">
            <component :is="iconosPaso[paso.id]" aria-hidden="true" />
            <Check v-if="paso.completo" class="marca-paso-completo" aria-hidden="true" />
          </span>
          <span class="texto-paso-editor">
            <small>Etapa {{ indice + 1 }}</small>
            <strong>{{ paso.etiqueta }}</strong>
            <span>{{ paso.descripcion }}</span>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>
