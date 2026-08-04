<script setup lang="ts">
import {
  ArrowRight,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Search,
  Trash2,
  X
} from '@lucide/vue'
import type {
  EnlaceArticuloInternoEditorial,
  ResumenArticuloPublico
} from '~/types/contenidoEditorial'

const props = defineProps<{
  modelValue?: EnlaceArticuloInternoEditorial | null
  articuloIdActual?: string
  deshabilitado?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [articulo: EnlaceArticuloInternoEditorial | null]
}>()

const modalAbierto = ref(false)
const cargando = ref(false)
const errorCarga = ref('')
const busqueda = ref('')
const articulos = ref<ResumenArticuloPublico[]>([])

const articulosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')
  const disponibles = articulos.value.filter(
    articulo => articulo.id !== props.articuloIdActual
  )

  if (!termino) return disponibles

  return disponibles.filter(articulo => (
    articulo.titulo.toLocaleLowerCase('es').includes(termino)
    || articulo.resumen.toLocaleLowerCase('es').includes(termino)
    || articulo.categoria.toLocaleLowerCase('es').includes(termino)
  ))
})

async function cargarArticulos() {
  if (articulos.value.length || cargando.value) return

  cargando.value = true
  errorCarga.value = ''

  try {
    articulos.value = await $fetch<ResumenArticuloPublico[]>('/api/articulos', {
      query: { limite: 50 }
    })
  } catch {
    errorCarga.value = 'No pudimos cargar las publicaciones. Intenta nuevamente.'
  } finally {
    cargando.value = false
  }
}

async function abrirSelector() {
  if (props.deshabilitado) return
  modalAbierto.value = true
  await cargarArticulos()
}

function cerrarSelector() {
  modalAbierto.value = false
  busqueda.value = ''
}

function seleccionarArticulo(articulo: ResumenArticuloPublico) {
  emit('update:modelValue', {
    articuloId: articulo.id,
    slug: articulo.slug,
    titulo: articulo.titulo,
    resumen: articulo.resumen,
    categoria: articulo.categoria,
    imagen: articulo.imagen
  })
  cerrarSelector()
}

function manejarTeclado(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && modalAbierto.value) cerrarSelector()
}

onMounted(() => window.addEventListener('keydown', manejarTeclado))
onBeforeUnmount(() => window.removeEventListener('keydown', manejarTeclado))
</script>

<template>
  <div class="selector-articulo-relacionado">
    <article v-if="modelValue" class="articulo-relacionado-seleccionado">
      <div class="miniatura-articulo-relacionado">
        <img
          v-if="modelValue.imagen"
          :src="modelValue.imagen"
          :alt="modelValue.titulo"
          width="160"
          height="90"
        >
        <ImageIcon v-else aria-hidden="true" />
      </div>
      <div>
        <span>{{ modelValue.categoria }}</span>
        <strong>{{ modelValue.titulo }}</strong>
        <p>{{ modelValue.resumen }}</p>
      </div>
      <div class="acciones-articulo-relacionado">
        <button
          type="button"
          title="Cambiar noticia"
          aria-label="Cambiar noticia relacionada"
          :disabled="deshabilitado"
          @click="abrirSelector"
        >
          <Link2 aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Quitar noticia"
          aria-label="Quitar noticia relacionada"
          :disabled="deshabilitado"
          @click="emit('update:modelValue', null)"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>

    <button
      v-else
      type="button"
      class="boton-seleccionar-articulo"
      :disabled="deshabilitado"
      @click="abrirSelector"
    >
      <Link2 aria-hidden="true" />
      <span>
        <strong>Seleccionar noticia publicada</strong>
        <small>Inserta un enlace interno contextual y verificable.</small>
      </span>
      <ArrowRight aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="modalAbierto"
        class="fondo-modal-editorial"
        role="presentation"
        @click.self="cerrarSelector"
      >
        <section
          class="modal-editorial modal-selector-articulos"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-selector-articulos"
        >
          <header class="cabecera-modal-editorial">
            <div>
              <span class="icono-modal-editorial"><Link2 aria-hidden="true" /></span>
              <div>
                <p class="etiqueta-panel">Enlace interno</p>
                <h2 id="titulo-selector-articulos">Selecciona una noticia</h2>
              </div>
            </div>
            <button
              type="button"
              title="Cerrar"
              aria-label="Cerrar selector"
              @click="cerrarSelector"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="contenido-selector-articulos">
            <label class="buscador-selector-articulos">
              <span class="sr-only">Buscar publicaciones</span>
              <Search aria-hidden="true" />
              <input
                v-model="busqueda"
                type="search"
                maxlength="100"
                placeholder="Buscar por título, resumen o categoría"
                autofocus
              >
            </label>

            <div v-if="cargando" class="estado-selector-articulos" role="status">
              <LoaderCircle class="icono-cargando" aria-hidden="true" />
              <span>Cargando publicaciones...</span>
            </div>

            <div v-else-if="errorCarga" class="estado-selector-articulos estado-error-selector">
              <p>{{ errorCarga }}</p>
              <button type="button" @click="cargarArticulos">Reintentar</button>
            </div>

            <div v-else-if="articulosFiltrados.length" class="lista-selector-articulos">
              <button
                v-for="articulo in articulosFiltrados"
                :key="articulo.id"
                type="button"
                @click="seleccionarArticulo(articulo)"
              >
                <span class="miniatura-articulo-relacionado">
                  <img
                    v-if="articulo.imagen"
                    :src="articulo.imagen"
                    :alt="articulo.titulo"
                    width="160"
                    height="90"
                    loading="lazy"
                  >
                  <ImageIcon v-else aria-hidden="true" />
                </span>
                <span class="datos-opcion-articulo">
                  <small>{{ articulo.categoria }}</small>
                  <strong>{{ articulo.titulo }}</strong>
                  <span>{{ articulo.resumen }}</span>
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
            </div>

            <p v-else class="estado-selector-articulos">
              No hay publicaciones que coincidan con la búsqueda.
            </p>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
