<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Inbox,
  RotateCcw,
  Search,
  SlidersHorizontal
} from '@lucide/vue'
import ModalCrearBorrador from '~/components/admin/ModalCrearBorrador.vue'
import TablaContenidosEditoriales from '~/components/admin/TablaContenidosEditoriales.vue'
import type {
  BorradorCreadoEditorial,
  EstadoContenidoEditorial,
  OrigenContenidoEditorial,
  RespuestaBandejaEditorial,
  TaxonomiasEditoriales,
  TipoContenidoEditorial
} from '~/types/contenidoEditorial'
import {
  etiquetasEstadoContenido,
  etiquetasOrigenContenido,
  etiquetasTipoContenido,
  estadosContenidoEditorial,
  origenesContenidoEditorial,
  tiposContenidoEditorial
} from '~/utils/editorial/contenido'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.verBorradores'
})

useSeoMeta({
  title: 'Contenidos | Pont3la10',
  robots: 'noindex, nofollow'
})

const { tienePermiso } = useContextoEditorial()
const busqueda = ref('')
const busquedaAplicada = ref('')
const estado = ref<EstadoContenidoEditorial | ''>('')
const tipo = ref<TipoContenidoEditorial | ''>('')
const origen = ref<OrigenContenidoEditorial | ''>('')
const categoriaId = ref('')
const pagina = ref(1)
const modalAbierto = ref(false)
const guardando = ref(false)
const errorCreacion = ref('')
const mensajeExito = ref('')

const consulta = computed(() => ({
  buscar: busquedaAplicada.value || undefined,
  estado: estado.value || undefined,
  tipo: tipo.value || undefined,
  origen: origen.value || undefined,
  categoriaId: categoriaId.value || undefined,
  pagina: pagina.value,
  limite: 20,
  orden: 'actualizadoDesc'
}))

const {
  data: respuesta,
  status,
  error,
  refresh
} = await useFetch<RespuestaBandejaEditorial>('/api/admin/contenidos', {
  query: consulta,
  watch: [consulta]
})

const {
  data: taxonomias
} = await useFetch<TaxonomiasEditoriales>('/api/admin/taxonomias')

const contenidos = computed(() => respuesta.value?.contenidos || [])
const paginacion = computed(() => respuesta.value?.paginacion || {
  pagina: 1,
  limite: 20,
  total: 0,
  totalPaginas: 1
})
const hayFiltros = computed(() => Boolean(
  busquedaAplicada.value
  || estado.value
  || tipo.value
  || origen.value
  || categoriaId.value
))

watch([estado, tipo, origen, categoriaId], () => {
  pagina.value = 1
})

function aplicarBusqueda() {
  busquedaAplicada.value = busqueda.value.trim()
  pagina.value = 1
}

function limpiarFiltros() {
  busqueda.value = ''
  busquedaAplicada.value = ''
  estado.value = ''
  tipo.value = ''
  origen.value = ''
  categoriaId.value = ''
  pagina.value = 1
}

function abrirModal() {
  errorCreacion.value = ''
  mensajeExito.value = ''
  modalAbierto.value = true
}

async function crearBorrador(entrada: {
  titulo: string
  resumen: string
  tipo: TipoContenidoEditorial
  categoriaId: string | null
}) {
  guardando.value = true
  errorCreacion.value = ''

  try {
    const borrador = await $fetch<BorradorCreadoEditorial>(
      '/api/admin/contenidos',
      {
        method: 'POST',
        body: entrada
      }
    )

    modalAbierto.value = false
    mensajeExito.value = `Borrador "${borrador.titulo}" creado correctamente.`
    limpiarFiltros()
    await refresh()
  } catch (errorPeticion: unknown) {
    const errorConDatos = errorPeticion as {
      data?: { statusMessage?: string }
      statusMessage?: string
    }
    errorCreacion.value = errorConDatos.data?.statusMessage
      || errorConDatos.statusMessage
      || 'No se pudo crear el borrador.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="vista-panel-editorial vista-bandeja-contenidos">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Mesa de trabajo</p>
        <h1>Contenidos</h1>
        <p>Organiza borradores, revisiones y publicaciones desde una sola bandeja.</p>
      </div>
      <button
        v-if="tienePermiso('contenido.crear')"
        class="boton-editorial-principal"
        type="button"
        @click="abrirModal"
      >
        <FilePlus2 aria-hidden="true" />
        <span>Nuevo borrador</span>
      </button>
    </header>

    <p v-if="mensajeExito" class="aviso-exito-editorial" role="status">
      {{ mensajeExito }}
    </p>

    <section class="barra-filtros-editoriales" aria-label="Filtros de contenidos">
      <form class="buscador-bandeja" role="search" @submit.prevent="aplicarBusqueda">
        <Search aria-hidden="true" />
        <input
          v-model="busqueda"
          type="search"
          maxlength="100"
          placeholder="Buscar por título"
          aria-label="Buscar contenidos por título"
        >
        <button type="submit">Buscar</button>
      </form>

      <div class="filtros-select-bandeja">
        <SlidersHorizontal aria-hidden="true" />
        <select v-model="estado" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option v-for="valor in estadosContenidoEditorial" :key="valor" :value="valor">
            {{ etiquetasEstadoContenido[valor] }}
          </option>
        </select>
        <select v-model="tipo" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option v-for="valor in tiposContenidoEditorial" :key="valor" :value="valor">
            {{ etiquetasTipoContenido[valor] }}
          </option>
        </select>
        <select v-model="categoriaId" aria-label="Filtrar por sección">
          <option value="">Todas las secciones</option>
          <option
            v-for="categoria in taxonomias?.categorias || []"
            :key="categoria.id"
            :value="categoria.id"
          >
            {{ categoria.nombre }}
          </option>
        </select>
        <select v-model="origen" aria-label="Filtrar por origen">
          <option value="">Todos los orígenes</option>
          <option v-for="valor in origenesContenidoEditorial" :key="valor" :value="valor">
            {{ etiquetasOrigenContenido[valor] }}
          </option>
        </select>
        <button
          v-if="hayFiltros"
          class="boton-icono-editorial"
          type="button"
          title="Limpiar filtros"
          aria-label="Limpiar filtros"
          @click="limpiarFiltros"
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </section>

    <section class="bandeja-contenidos-panel" aria-live="polite">
      <div v-if="status === 'pending'" class="esqueleto-tabla-contenidos" aria-label="Cargando contenidos">
        <span v-for="indice in 7" :key="indice" />
      </div>

      <div v-else-if="error" class="estado-vacio-panel">
        <RotateCcw aria-hidden="true" />
        <h2>No pudimos cargar los contenidos</h2>
        <p>Comprueba la migración editorial o vuelve a intentar la consulta.</p>
        <button class="boton-editorial-secundario" type="button" @click="() => refresh()">
          Reintentar
        </button>
      </div>

      <div v-else-if="!contenidos.length" class="estado-vacio-panel">
        <Inbox aria-hidden="true" />
        <h2>{{ hayFiltros ? 'No encontramos coincidencias' : 'La bandeja está lista' }}</h2>
        <p>
          {{ hayFiltros
            ? 'Ajusta los filtros para ampliar la búsqueda.'
            : 'Crea el primer borrador manual de Pont3la10.'
          }}
        </p>
        <button
          v-if="!hayFiltros && tienePermiso('contenido.crear')"
          class="boton-editorial-principal"
          type="button"
          @click="abrirModal"
        >
          <FilePlus2 aria-hidden="true" />
          Crear borrador
        </button>
      </div>

      <template v-else>
        <TablaContenidosEditoriales :contenidos="contenidos" />
        <footer class="paginacion-editorial">
          <span>
            {{ paginacion.total }} contenidos
            <strong>Página {{ paginacion.pagina }} de {{ paginacion.totalPaginas }}</strong>
          </span>
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
              :disabled="pagina >= paginacion.totalPaginas"
              @click="pagina += 1"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </footer>
      </template>
    </section>

    <ModalCrearBorrador
      :abierto="modalAbierto"
      :categorias="taxonomias?.categorias || []"
      :guardando="guardando"
      :error="errorCreacion"
      @cerrar="modalAbierto = false"
      @crear="crearBorrador"
    />
  </div>
</template>
