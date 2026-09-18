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
import ModalEliminarIngesta from '~/components/admin/ModalEliminarIngesta.vue'
import TablaIngestasEditoriales from '~/components/admin/TablaIngestasEditoriales.vue'
import type { TaxonomiasEditoriales } from '~/types/contenidoEditorial'
import type {
  EntradaCrearIngestaEditorial,
  EstadoIngestaEditorial,
  IngestaEditorial,
  IngestaEditorialCreada,
  ResultadoEliminacionIngestaEditorial,
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

const { tienePermiso, contextoEditorial } = useContextoEditorial()
const { $clienteSupabase } = useNuxtApp()
const { ejecutarConBloqueo } = useBloqueoInterfaz()
const { mostrarAlerta } = useAlertasEditoriales()
const busqueda = ref('')
const busquedaAplicada = ref('')
const estado = ref<EstadoIngestaEditorial | ''>('')
const plataforma = ref<PlataformaIngestaEditorial | ''>('')
const pagina = ref(1)
const formularioAbierto = ref(false)
const guardando = ref(false)
const cancelandoId = ref('')
const reencolandoId = ref('')
const reintentandoBorradorId = ref('')
const ingestaAEliminar = ref<IngestaEditorial | null>(null)
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

let canalIngestas: ReturnType<NonNullable<typeof $clienteSupabase>['channel']> | null = null
onMounted(() => {
  if (!$clienteSupabase) return
  canalIngestas = $clienteSupabase
    .channel('ingestas-editoriales-en-vivo')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'editorial_ingestions'
    }, () => refresh())
    .subscribe()
})
onBeforeUnmount(() => {
  if (canalIngestas && $clienteSupabase) $clienteSupabase.removeChannel(canalIngestas)
})

watch([estado, plataforma], () => {
  pagina.value = 1
})

watch(errorAccion, mensaje => {
  if (mensaje) mostrarAlerta({ tipo: 'error', titulo: 'Acción editorial no completada', mensaje })
})

watch(mensajeExito, mensaje => {
  if (mensaje) mostrarAlerta({ tipo: 'exito', titulo: 'Acción editorial completada', mensaje })
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

async function reencolarIngesta(ingesta: IngestaEditorial) {
  reencolandoId.value = ingesta.id
  errorAccion.value = ''
  mensajeExito.value = ''
  await ejecutarConBloqueo(
    `reencolar-ingesta-${ingesta.id}`,
    'Reencolando evidencia editorial',
    async () => {
      try {
        await $fetch('/api/admin/ingestas/' + ingesta.id, {
          method: 'PATCH',
          body: { accion: 'reencolar' }
        })
        mensajeExito.value = 'La ingesta volvió a la cola de evidencias.'
        await refresh()
      } catch (errorPeticion) {
        errorAccion.value = obtenerMensajeError(errorPeticion, 'No se pudo reencolar la ingesta.')
        await refresh()
      } finally {
        reencolandoId.value = ''
      }
    }
  )
}

async function ingestaEliminada(_resultado: ResultadoEliminacionIngestaEditorial) {
  ingestaAEliminar.value = null
  mostrarAlerta({
    tipo: 'exito',
    titulo: 'Ingesta eliminada',
    mensaje: 'La ingesta, su historial técnico y cualquier borrador automático asociado fueron eliminados definitivamente.'
  })
  await refresh()
}

async function reintentarBorrador(ingesta: IngestaEditorial) {
  if (!confirm('Esto hará una nueva llamada a la IA usando la evidencia ya guardada. ¿Reintentar borrador?')) return
  reintentandoBorradorId.value = ingesta.id
  errorAccion.value = ''
  mensajeExito.value = ''
  try {
    const resultado = await $fetch<{ id: string, yaExistia: boolean }>(`/api/admin/ingestas/${ingesta.id}/borrador`, { method: 'POST', body: { regenerar: true } })
    mensajeExito.value = resultado.yaExistia ? 'El borrador ya existía.' : 'Borrador reintentado y listo para revisión humana.'
    await refresh()
  } catch (errorPeticion) {
    errorAccion.value = obtenerMensajeError(errorPeticion, 'No se pudo reintentar el borrador.')
    await refresh()
  } finally {
    reintentandoBorradorId.value = ''
  }
}
</script>

<template>
  <div class="vista-panel-editorial vista-ingestas-editoriales">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Entrada de historias</p>
        <h1>Ingestas editoriales</h1>
        <p>Centraliza enlaces para extraer metadatos, transcripción y traducción antes de redactar.</p>
      </div>
      <button
        v-if="tienePermiso('ingestas.registrar') && !formularioAbierto"
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
    <section class="resumen-cola-ingestas" aria-label="Estado de la cola">
      <div>
        <FileInput aria-hidden="true" />
        <span><strong>{{ paginacion.total }}</strong> solicitudes registradas</span>
      </div>
      <p>La evidencia lista puede convertirse en un borrador trazable; toda publicación conserva aprobación humana.</p>
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
          v-if="!hayFiltros && tienePermiso('ingestas.registrar')"
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
          :puede-eliminar="tienePermiso('ingestas.eliminar')"
          :puede-redactar="tienePermiso('ingestas.redactar')"
          :cancelando-id="cancelandoId || reencolandoId || reintentandoBorradorId"
          @cancelar="cancelarIngesta"
          @reencolar="reencolarIngesta"
          @eliminar="ingestaAEliminar = $event"
          @reintentar-borrador="reintentarBorrador"
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

    <ModalEliminarIngesta
      v-if="ingestaAEliminar"
      :ingesta="ingestaAEliminar"
      :nivel-aal="contextoEditorial?.nivelAal"
      retorno="/admin/ingestas"
      @cerrar="ingestaAEliminar = null"
      @eliminada="ingestaEliminada"
    />
  </div>
</template>
