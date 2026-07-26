<script setup lang="ts">
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageOff,
  Pencil,
  Search,
  Trash2
} from '@lucide/vue'
import type {
  MedioEditorial,
  RespuestaBibliotecaMedios
} from '~/types/mediaEditorial'
import { formatearTamanoArchivo } from '~/utils/media/editorial'

const props = defineProps<{
  modoSelector?: boolean
  seleccionadoId?: string | null
}>()

const emit = defineEmits<{
  seleccionar: [medio: MedioEditorial]
  editar: [medio: MedioEditorial]
  eliminar: [medio: MedioEditorial]
}>()

const { tienePermiso } = useContextoEditorial()
const busqueda = ref('')
const busquedaAplicada = ref('')
const pagina = ref(1)
const urlCopiada = ref('')

const consulta = computed(() => ({
  pagina: pagina.value,
  limite: props.modoSelector ? 12 : 24,
  busqueda: busquedaAplicada.value
}))

const {
  data,
  status,
  error,
  refresh
} = useFetch<RespuestaBibliotecaMedios>('/api/admin/media', {
  query: consulta,
  watch: [consulta]
})

function buscar() {
  pagina.value = 1
  busquedaAplicada.value = busqueda.value.trim()
}

async function copiarUrl(medio: MedioEditorial) {
  if (!import.meta.client) return
  await navigator.clipboard.writeText(medio.urlPublica)
  urlCopiada.value = medio.id
  window.setTimeout(() => {
    if (urlCopiada.value === medio.id) urlCopiada.value = ''
  }, 1600)
}

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium'
  }).format(new Date(fecha))
}

defineExpose({ refresh })
</script>

<template>
  <div class="biblioteca-medios-editorial">
    <form
      class="buscador-biblioteca-medios"
      role="search"
      @submit.prevent="buscar"
    >
      <Search aria-hidden="true" />
      <input
        v-model="busqueda"
        type="search"
        maxlength="100"
        aria-label="Buscar imágenes"
        placeholder="Buscar por título, archivo o descripción"
      >
      <button type="submit">Buscar</button>
    </form>

    <div
      v-if="status === 'pending'"
      class="esqueleto-biblioteca-medios"
      aria-label="Cargando biblioteca multimedia"
    >
      <span v-for="indice in (modoSelector ? 8 : 12)" :key="indice" />
    </div>

    <section
      v-else-if="error"
      class="estado-vacio-panel estado-vacio-medios"
    >
      <ImageOff aria-hidden="true" />
      <h2>No pudimos cargar las imágenes</h2>
      <p>Comprueba la conexión y vuelve a intentarlo.</p>
      <button
        class="boton-editorial-secundario"
        type="button"
        @click="() => refresh()"
      >
        Reintentar
      </button>
    </section>

    <section
      v-else-if="!data?.medios.length"
      class="estado-vacio-panel estado-vacio-medios"
    >
      <ImageOff aria-hidden="true" />
      <h2>{{ busquedaAplicada ? 'No encontramos coincidencias' : 'La biblioteca está vacía' }}</h2>
      <p>
        {{ busquedaAplicada
          ? 'Prueba con otro título o nombre de archivo.'
          : 'Sube la primera imagen optimizada para tus contenidos.' }}
      </p>
    </section>

    <div v-else class="grilla-biblioteca-medios">
      <article
        v-for="medio in data.medios"
        :key="medio.id"
        class="tarjeta-medio-editorial"
        :class="{
          seleccionada: seleccionadoId === medio.id,
          'modo-selector': modoSelector
        }"
      >
        <button
          v-if="modoSelector"
          class="accion-seleccionar-medio"
          type="button"
          :aria-label="`Seleccionar ${medio.titulo}`"
          @click="emit('seleccionar', medio)"
        >
          <img
            :src="medio.urlPublica"
            :alt="medio.esDecorativa ? '' : medio.textoAlternativo"
            loading="lazy"
            width="640"
            height="360"
          >
          <span v-if="seleccionadoId === medio.id">
            <Check aria-hidden="true" />
            Seleccionada
          </span>
        </button>
        <div v-else class="imagen-tarjeta-medio">
          <img
            :src="medio.urlPublica"
            :alt="medio.esDecorativa ? '' : medio.textoAlternativo"
            loading="lazy"
            width="640"
            height="360"
          >
        </div>

        <div class="detalle-tarjeta-medio">
          <strong :title="medio.titulo">{{ medio.titulo }}</strong>
          <span>
            {{ medio.ancho }} × {{ medio.alto }}
            · {{ formatearTamanoArchivo(medio.tamanoBytes) }}
          </span>
          <small>{{ formatearFecha(medio.creadoEn) }}</small>
        </div>

        <div v-if="!modoSelector" class="acciones-tarjeta-medio">
          <button
            type="button"
            :title="urlCopiada === medio.id ? 'URL copiada' : 'Copiar URL'"
            :aria-label="urlCopiada === medio.id ? 'URL copiada' : `Copiar URL de ${medio.titulo}`"
            @click="copiarUrl(medio)"
          >
            <Check v-if="urlCopiada === medio.id" aria-hidden="true" />
            <Copy v-else aria-hidden="true" />
          </button>
          <button
            v-if="tienePermiso('media.editar')"
            type="button"
            title="Editar metadatos"
            :aria-label="`Editar metadatos de ${medio.titulo}`"
            @click="emit('editar', medio)"
          >
            <Pencil aria-hidden="true" />
          </button>
          <button
            v-if="tienePermiso('media.eliminar')"
            class="accion-peligrosa-medio"
            type="button"
            title="Eliminar imagen"
            :aria-label="`Eliminar ${medio.titulo}`"
            @click="emit('eliminar', medio)"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>

    <footer
      v-if="data && data.paginacion.total > 0"
      class="paginacion-biblioteca-medios"
    >
      <span>{{ data.paginacion.total }} imágenes</span>
      <strong>
        Página {{ data.paginacion.pagina }} de {{ data.paginacion.totalPaginas }}
      </strong>
      <div>
        <button
          type="button"
          title="Página anterior"
          aria-label="Página anterior"
          :disabled="pagina <= 1"
          @click="pagina -= 1"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Página siguiente"
          aria-label="Página siguiente"
          :disabled="pagina >= data.paginacion.totalPaginas"
          @click="pagina += 1"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </footer>
  </div>
</template>
