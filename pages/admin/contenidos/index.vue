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
import PanelPestanas from '~/components/admin/ui/PanelPestanas.vue'
import PanelPopover from '~/components/admin/ui/PanelPopover.vue'
import ModalCrearBorrador from '~/components/admin/ModalCrearBorrador.vue'
import ModalEliminarContenido from '~/components/admin/ModalEliminarContenido.vue'
import TablaContenidosEditoriales from '~/components/admin/TablaContenidosEditoriales.vue'
import type { ResumenPanelEditorial } from '~/types/editorial'
import type {
  BorradorCreadoEditorial,
  ArticuloBandejaEditorial,
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
  title: 'Contenidos | Ponte la 10',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const { contextoEditorial, tienePermiso } = useContextoEditorial()
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
const articuloEliminar = ref<ArticuloBandejaEditorial | null>(null)
const retornoBandeja = computed(() => route.fullPath)

if (route.query.eliminado === '1') {
  mensajeExito.value = 'El contenido se eliminó definitivamente.'
}

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

// Conteos de las pestañas: no bloquean la bandeja si fallan.
const { data: resumen } = useFetch<ResumenPanelEditorial>('/api/admin/resumen', { lazy: true, server: false })

const pestanasEstado = computed(() => [
  { id: 'todos', etiqueta: 'Todos', conteo: resumen.value?.totalContenidos ?? null },
  { id: 'draft', etiqueta: 'Borradores', conteo: resumen.value?.borradores ?? null },
  { id: 'review', etiqueta: 'En revisión', conteo: resumen.value?.enRevision ?? null },
  { id: 'scheduled', etiqueta: 'Programados' },
  { id: 'published', etiqueta: 'Publicados', conteo: resumen.value?.publicados ?? null }
])
const pestanaActiva = computed({
  get: () => (estado.value === '' ? 'todos' : pestanasEstado.value.some(p => p.id === estado.value) ? estado.value : 'otro'),
  set: (valor: string) => { estado.value = valor === 'todos' ? '' : valor as EstadoContenidoEditorial }
})
const filtrosAvanzados = computed(() => [tipo.value, categoriaId.value, origen.value].filter(Boolean).length
  + (estado.value && !pestanasEstado.value.some(p => p.id === estado.value) ? 1 : 0))

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

// Atajo de la paleta (Ctrl K → «Nuevo borrador»).
if (route.query.nuevo === '1' && tienePermiso('contenido.crear')) {
  onMounted(() => {
    abrirModal()
    navigateTo({ path: route.path, query: {} }, { replace: true })
  })
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

async function contenidoEliminado() {
  articuloEliminar.value = null
  mensajeExito.value = 'El contenido se eliminó definitivamente.'
  await refresh()
}
</script>

<template>
  <div class="pagina-ajustada">
    <header class="titulo-vista-panel">
      <div>
        <h1>Contenidos</h1>
        <p>Borradores, revisiones y publicaciones en una sola bandeja.</p>
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

    <p v-if="mensajeExito" class="aviso-panel" role="status">{{ mensajeExito }}</p>

    <PanelPestanas v-model="pestanaActiva" :pestanas="pestanasEstado" etiqueta="Estado de los contenidos" />

    <section class="barra-herramientas" aria-label="Buscar y filtrar contenidos">
      <form class="buscador-panel" role="search" @submit.prevent="aplicarBusqueda">
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

      <PanelPopover etiqueta="Filtros" :insignia="filtrosAvanzados">
        <template #icono><SlidersHorizontal aria-hidden="true" /></template>
        <div class="popover-panel-formulario">
          <label>Tipo
            <select v-model="tipo" class="campo-panel">
              <option value="">Todos los tipos</option>
              <option v-for="valor in tiposContenidoEditorial" :key="valor" :value="valor">{{ etiquetasTipoContenido[valor] }}</option>
            </select>
          </label>
          <label>Sección
            <select v-model="categoriaId" class="campo-panel">
              <option value="">Todas las secciones</option>
              <option v-for="categoria in taxonomias?.categorias || []" :key="categoria.id" :value="categoria.id">{{ categoria.nombre }}</option>
            </select>
          </label>
          <label>Origen
            <select v-model="origen" class="campo-panel">
              <option value="">Todos los orígenes</option>
              <option v-for="valor in origenesContenidoEditorial" :key="valor" :value="valor">{{ etiquetasOrigenContenido[valor] }}</option>
            </select>
          </label>
          <label>Otros estados
            <select v-model="estado" class="campo-panel">
              <option value="">Cualquiera</option>
              <option v-for="valor in estadosContenidoEditorial" :key="valor" :value="valor">{{ etiquetasEstadoContenido[valor] }}</option>
            </select>
          </label>
        </div>
      </PanelPopover>

      <button v-if="hayFiltros" class="boton-panel" type="button" @click="limpiarFiltros">
        <RotateCcw aria-hidden="true" />
        Limpiar
      </button>
    </section>

    <section class="zona-desplazable" aria-live="polite" aria-label="Lista de contenidos">
      <div v-if="status === 'pending'" aria-label="Cargando contenidos">
        <div v-for="indice in 8" :key="indice" class="esqueleto-fila" />
      </div>

      <div v-else-if="error" class="estado-vacio-compacto">
        <RotateCcw aria-hidden="true" />
        <h2>No pudimos cargar los contenidos</h2>
        <p>Comprueba la migración editorial o vuelve a intentar la consulta.</p>
        <button class="boton-panel" type="button" @click="() => refresh()">Reintentar</button>
      </div>

      <div v-else-if="!contenidos.length" class="estado-vacio-compacto">
        <Inbox aria-hidden="true" />
        <h2>{{ hayFiltros ? 'No encontramos coincidencias' : 'La bandeja está lista' }}</h2>
        <p>{{ hayFiltros ? 'Ajusta los filtros para ampliar la búsqueda.' : 'Crea el primer borrador manual de Ponte la 10.' }}</p>
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

      <TablaContenidosEditoriales
        v-else
        :contenidos="contenidos"
        :puede-eliminar="tienePermiso('contenido.eliminar')"
        @eliminar="articuloEliminar = $event"
      />
    </section>

    <footer v-if="contenidos.length" class="pie-lista">
      <span><strong>{{ paginacion.total }}</strong> contenidos · página {{ paginacion.pagina }} de {{ paginacion.totalPaginas }}</span>
      <div class="paginas">
        <button type="button" title="Página anterior" aria-label="Página anterior" :disabled="pagina <= 1" @click="pagina -= 1">
          <ChevronLeft aria-hidden="true" />
        </button>
        <button type="button" title="Página siguiente" aria-label="Página siguiente" :disabled="pagina >= paginacion.totalPaginas" @click="pagina += 1">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </footer>

    <ModalCrearBorrador
      :abierto="modalAbierto"
      :categorias="taxonomias?.categorias || []"
      :guardando="guardando"
      :error="errorCreacion"
      @cerrar="modalAbierto = false"
      @crear="crearBorrador"
    />

    <ModalEliminarContenido
      v-if="articuloEliminar"
      :articulo="articuloEliminar"
      :nivel-aal="contextoEditorial?.nivelAal || undefined"
      :retorno="retornoBandeja"
      @cerrar="articuloEliminar = null"
      @eliminado="contenidoEliminado"
    />
  </div>
</template>
