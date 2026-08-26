<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  FileInput,
  Inbox,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal
} from '@lucide/vue'
import FormularioNuevaIngesta from '~/components/admin/FormularioNuevaIngesta.vue'
import TablaIngestasEditoriales from '~/components/admin/TablaIngestasEditoriales.vue'
import type { TaxonomiasEditoriales } from '~/types/contenidoEditorial'
import type {
  EntradaCrearIngestaEditorial,
  EstadoIngestaEditorial,
  IngestaEditorial,
  IngestaEditorialCreada,
  PlataformaIngestaEditorial,
  RespuestaBandejaIngestasEditoriales
} from '~/types/ingestaEditorial'
import {
  estadosIngestaEditorial,
  etiquetasEstadoIngesta,
  etiquetasPlataformaIngesta,
  plataformasIngestaEditorial
} from '~/utils/editorial/ingestas'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'ingestas.ver'
})

useSeoMeta({
  title: 'Ingestas editoriales | Pont3la10',
  robots: 'noindex, nofollow'
})

const { tienePermiso } = useContextoEditorial()
const { ejecutarConBloqueo } = useBloqueoInterfaz()
const busqueda = ref('')
const busquedaAplicada = ref('')
const estado = ref<EstadoIngestaEditorial | ''>('')
const plataforma = ref<PlataformaIngestaEditorial | ''>('')
const pagina = ref(1)
const formularioAbierto = ref(false)
const guardando = ref(false)
const cancelandoId = ref('')
const errorAccion = ref('')
const mensajeExito = ref('')

const consulta = computed(() => ({
  buscar: busquedaAplicada.value || undefined,
  estado: estado.value || undefined,
  plataforma: plataforma.value || undefined,
  pagina: pagina.value,
  limite: 20
}))

const {
  data: respuesta,
  status,
  error,
  refresh
} = await useFetch<RespuestaBandejaIngestasEditoriales>('/api/admin/ingestas', {
  query: consulta,
  watch: [consulta]
})

const { data: taxonomias } = await useFetch<TaxonomiasEditoriales>(
  '/api/admin/taxonomias'
)

const ingestas = computed(() => respuesta.value?.ingestas || [])
const paginacion = computed(() => respuesta.value?.paginacion || {
  pagina: 1,
  limite: 20,
  total: 0,
  totalPaginas: 1
})
const hayFiltros = computed(() => Boolean(
  busquedaAplicada.value || estado.value || plataforma.value
))

watch([estado, plataforma], () => {
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
  plataforma.value = ''
  pagina.value = 1
}

function obtenerMensajeError(errorPeticion: unknown, respaldo: string): string {
  const errorConDatos = errorPeticion as {
    data?: { statusMessage?: string, data?: { statusMessage?: string } }
    statusMessage?: string
  }

  return errorConDatos.data?.statusMessage
    || errorConDatos.data?.data?.statusMessage
    || errorConDatos.statusMessage
    || respaldo
}

async function registrarFuente(entrada: EntradaCrearIngestaEditorial) {
  guardando.value = true
  errorAccion.value = ''
  mensajeExito.value = ''

  await ejecutarConBloqueo(
    'registrar-ingesta',
    'Registrando fuente editorial',
    async () => {
      try {
        const creada = await $fetch<IngestaEditorialCreada>('/api/admin/ingestas', {
          method: 'POST',
          body: entrada
        })
        formularioAbierto.value = false
        mensajeExito.value = `Fuente ${etiquetasPlataformaIngesta[creada.plataforma]} registrada en la cola.`
        limpiarFiltros()
        await refresh()
      } catch (errorPeticion) {
        errorAccion.value = obtenerMensajeError(
          errorPeticion,
          'No se pudo registrar la fuente.'
        )
      } finally {
        guardando.value = false
      }
    }
  )
}

async function cancelarIngesta(ingesta: IngestaEditorial) {
  if (!confirm('¿Cancelar esta solicitud de ingesta? La fuente no será procesada.')) return

  cancelandoId.value = ingesta.id
  errorAccion.value = ''
  mensajeExito.value = ''

  await ejecutarConBloqueo(
    `cancelar-ingesta-${ingesta.id}`,
    'Cancelando solicitud editorial',
    async () => {
      try {
        await $fetch(`/api/admin/ingestas/${ingesta.id}`, {
          method: 'PATCH',
          body: { accion: 'cancelar' }
        })
        mensajeExito.value = 'La solicitud quedó cancelada.'
        await refresh()
      } catch (errorPeticion) {
        errorAccion.value = obtenerMensajeError(
          errorPeticion,
          'No se pudo cancelar la solicitud.'
        )
      } finally {
        cancelandoId.value = ''
      }
    }
  )
}
</script>

<template>
  <div class="vista-panel-editorial vista-ingestas-editoriales">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Entrada de historias</p>
        <h1>Ingestas editoriales</h1>
        <p>Centraliza enlaces que luego podrán convertirse en borradores verificables y editables.</p>
      </div>
      <button
        v-if="tienePermiso('ingestas.gestionar') && !formularioAbierto"
        class="boton-editorial-principal"
        type="button"
        @click="formularioAbierto = true"
      >
        <Plus aria-hidden="true" />
        <span>Nueva fuente</span>
      </button>
    </header>

    <FormularioNuevaIngesta
      v-if="formularioAbierto"
      :categorias="taxonomias?.categorias || []"
      :guardando="guardando"
      :error="errorAccion"
      @cerrar="formularioAbierto = false"
      @registrar="registrarFuente"
    />

    <p v-if="mensajeExito" class="aviso-exito-editorial" role="status">
      {{ mensajeExito }}
    </p>
    <p v-if="errorAccion && !formularioAbierto" class="aviso-error-editorial" role="alert">
      {{ errorAccion }}
    </p>

    <section class="resumen-cola-ingestas" aria-label="Estado de la cola">
      <div>
        <FileInput aria-hidden="true" />
        <span><strong>{{ paginacion.total }}</strong> solicitudes registradas</span>
      </div>
      <p>Esta fase registra y organiza fuentes. El procesamiento automático se habilitará en la siguiente fase.</p>
    </section>

    <section class="barra-filtros-editoriales" aria-label="Filtros de ingestas">
      <form class="buscador-bandeja" role="search" @submit.prevent="aplicarBusqueda">
        <Search aria-hidden="true" />
        <input
          v-model="busqueda"
          type="search"
          maxlength="120"
          placeholder="Buscar por título, dominio o URL"
          aria-label="Buscar ingestas"
        >
        <button type="submit">Buscar</button>
      </form>

      <div class="filtros-select-bandeja filtros-ingestas">
        <SlidersHorizontal aria-hidden="true" />
        <select v-model="estado" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option v-for="valor in estadosIngestaEditorial" :key="valor" :value="valor">
            {{ etiquetasEstadoIngesta[valor] }}
          </option>
        </select>
        <select v-model="plataforma" aria-label="Filtrar por plataforma">
          <option value="">Todas las plataformas</option>
          <option v-for="valor in plataformasIngestaEditorial" :key="valor" :value="valor">
            {{ etiquetasPlataformaIngesta[valor] }}
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

    <section class="bandeja-ingestas-panel" aria-live="polite">
      <div v-if="status === 'pending'" class="esqueleto-tabla-contenidos" aria-label="Cargando ingestas">
        <span v-for="indice in 7" :key="indice" />
      </div>

      <div v-else-if="error" class="estado-vacio-panel">
        <RotateCcw aria-hidden="true" />
        <h2>No pudimos cargar las ingestas</h2>
        <p>Comprueba que la migración de la cola esté aplicada y vuelve a intentarlo.</p>
        <button class="boton-editorial-secundario" type="button" @click="() => refresh()">
          Reintentar
        </button>
      </div>

      <div v-else-if="!ingestas.length" class="estado-vacio-panel">
        <Inbox aria-hidden="true" />
        <h2>{{ hayFiltros ? 'No encontramos coincidencias' : 'La cola está lista' }}</h2>
        <p>
          {{ hayFiltros
            ? 'Ajusta los filtros para ampliar la búsqueda.'
            : 'Registra la primera fuente que quieras convertir en historia.'
          }}
        </p>
        <button
          v-if="!hayFiltros && tienePermiso('ingestas.gestionar')"
          class="boton-editorial-principal"
          type="button"
          @click="formularioAbierto = true"
        >
          <Plus aria-hidden="true" />
          Registrar fuente
        </button>
      </div>

      <template v-else>
        <TablaIngestasEditoriales
          :ingestas="ingestas"
          :puede-gestionar="tienePermiso('ingestas.gestionar')"
          :cancelando-id="cancelandoId"
          @cancelar="cancelarIngesta"
        />

        <footer class="paginacion-editorial">
          <span>{{ paginacion.total }} solicitudes</span>
          <div>
            <button
              type="button"
              :disabled="pagina <= 1"
              aria-label="Página anterior"
              title="Página anterior"
              @click="pagina -= 1"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <strong>{{ pagina }} / {{ paginacion.totalPaginas }}</strong>
            <button
              type="button"
              :disabled="pagina >= paginacion.totalPaginas"
              aria-label="Página siguiente"
              title="Página siguiente"
              @click="pagina += 1"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </footer>
      </template>
    </section>
  </div>
</template>
