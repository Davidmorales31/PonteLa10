<script setup lang="ts">
import { ImagePlus, X } from '@lucide/vue'
import BibliotecaMediosEditorial from '~/components/admin/BibliotecaMediosEditorial.vue'
import type { MedioEditorial } from '~/types/mediaEditorial'

defineProps<{
  seleccionadoId?: string | null
  puedeSubir?: boolean
}>()

const emit = defineEmits<{
  cerrar: []
  seleccionar: [medio: MedioEditorial]
  solicitarSubida: []
}>()
</script>

<template>
  <div
    class="fondo-modal-editorial"
    role="presentation"
    @mousedown.self="emit('cerrar')"
  >
    <section
      class="modal-editorial modal-selector-portada"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-selector-portada"
    >
      <header class="cabecera-modal-editorial">
        <div>
          <p class="etiqueta-panel">Portada</p>
          <h2 id="titulo-selector-portada">Elegir imagen</h2>
          <span>Selecciona una imagen optimizada de la biblioteca.</span>
        </div>
        <div class="acciones-cabecera-selector">
          <button
            v-if="puedeSubir"
            class="boton-editorial-secundario"
            type="button"
            @click="emit('solicitarSubida')"
          >
            <ImagePlus aria-hidden="true" />
            Subir imagen
          </button>
          <button
            type="button"
            title="Cerrar"
            aria-label="Cerrar selector de portada"
            @click="emit('cerrar')"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <BibliotecaMediosEditorial
        modo-selector
        :seleccionado-id="seleccionadoId"
        @seleccionar="emit('seleccionar', $event)"
      />
    </section>
  </div>
</template>
