<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Clock3,
  Eye,
  FileClock,
  Image,
  ImagePlus,
  Link2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  X
} from '@lucide/vue'
import EditorBloquesContenido from '~/components/admin/EditorBloquesContenido.vue'
import ModalSubirMedio from '~/components/admin/ModalSubirMedio.vue'
import PanelFlujoEditorial from '~/components/admin/PanelFlujoEditorial.vue'
import SelectorPortadaEditorial from '~/components/admin/SelectorPortadaEditorial.vue'
import VistaPreviaArticulo from '~/components/admin/VistaPreviaArticulo.vue'
import type {
  ArticuloDetalleEditorial,
  BloqueEditorEditorial,
  CargaEditorArticuloEditorial,
  ComentarioRevisionEditorial,
  DatosEditorArticulo,
  EntradaTransicionEditorial,
  FlujoArticuloEditorial,
  ResultadoGuardadoEditorial,
  VersionArticuloEditorial
} from '~/types/contenidoEditorial'
import type { MedioEditorial } from '~/types/mediaEditorial'
import {
  crearSlugEditorial,
  esquemaDatosEditorArticulo,
  etiquetasEstadoContenido
} from '~/utils/editorial/contenido'
import {
  convertirBloquesADocumento,
  convertirDocumentoABloques,
  contarPalabrasDocumento,
  estimarMinutosLectura
} from '~/utils/editorial/documento'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.verBorradores'
})

useSeoMeta({
  title: 'Editor de contenido | Pont3la10',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const articuloId = computed(() => String(route.params.id || ''))
const { ejecutarConBloqueo } = useBloqueoInterfaz()
const { contextoEditorial, tienePermiso } = useContextoEditorial()

const {
  data: cargaEditor,
  status,
  error,
  refresh: recargarCargaEditor
} = await useFetch<CargaEditorArticuloEditorial>(
  () => `/api/admin/contenidos/${articuloId.value}/editor`
)

const articulo = ref<ArticuloDetalleEditorial | null>(
  cargaEditor.value?.articulo || null
)
const versiones = ref<VersionArticuloEditorial[]>(
  cargaEditor.value?.versiones || []
)
const taxonomias = computed(() => cargaEditor.value?.taxonomias || null)
const flujo = ref<FlujoArticuloEditorial | null>(
  cargaEditor.value?.flujo || null
)
const portadaSeleccionada = ref<MedioEditorial | null>(
  cargaEditor.value?.articulo.portada || null
)

watch(cargaEditor, (carga) => {
  if (!carga) return
  articulo.value = carga.articulo
  versiones.value = carga.versiones
  flujo.value = carga.flujo
  portadaSeleccionada.value = carga.articulo.portada
})

async function recargarArticulo() {
  await recargarCargaEditor()

  if (cargaEditor.value) {
    articulo.value = cargaEditor.value.articulo
    versiones.value = cargaEditor.value.versiones
    flujo.value = cargaEditor.value.flujo
  }
}

async function recargarVersiones() {
  versiones.value = await $fetch<VersionArticuloEditorial[]>(
    `/api/admin/contenidos/${articuloId.value}/versiones`
  )
}

const formulario = ref<DatosEditorArticulo | null>(null)
const bloques = ref<BloqueEditorEditorial[]>([])
const versionBloqueo = ref(1)
const referenciaGuardada = ref('')
const inicializando = ref(true)
const cambiosPendientes = ref(false)
const guardando = ref(false)
const autoguardando = ref(false)
const vistaPreviaAbierta = ref(false)
const selectorPortadaAbierto = ref(false)
const modalSubidaMedioAbierto = ref(false)
const mensajeEstado = ref('')
const errorGuardado = ref('')
const conflictoVersion = ref(false)
const notaCambio = ref('')
const ultimoAutoguardado = ref('')
let temporizadorAutoguardado: ReturnType<typeof setTimeout> | null = null

const documentoActual = computed(() => convertirBloquesADocumento(bloques.value))

const datosActuales = computed<DatosEditorArticulo | null>(() => {
  if (!formulario.value) return null

  return {
    ...formulario.value,
    temaIds: [...formulario.value.temaIds],
    etiquetaIds: [...formulario.value.etiquetaIds],
    documento: documentoActual.value,
    fuente: { ...formulario.value.fuente },
    seo: { ...formulario.value.seo }
  }
})

const categoriaActual = computed(() => taxonomias.value?.categorias
  .find(categoria => categoria.id === formulario.value?.categoriaId)
)

const totalPalabras = computed(() => contarPalabrasDocumento(documentoActual.value))
const minutosLectura = computed(() => estimarMinutosLectura(documentoActual.value))
const puedeEditar = computed(() => Boolean(articulo.value?.puedeEditar))
const hayAutoguardadoRecuperable = computed(() => {
  const autoguardado = articulo.value?.autoguardado

  return Boolean(
    autoguardado
    && autoguardado.versionBase === versionBloqueo.value
    && new Date(autoguardado.actualizadoEn) > new Date(articulo.value?.actualizadoEn || 0)
  )
})

function serializarDatos(datos: DatosEditorArticulo): string {
  return JSON.stringify(datos)
}

function aplicarDatos(datos: DatosEditorArticulo) {
  formulario.value = {
    ...datos,
    temaIds: [...datos.temaIds],
    etiquetaIds: [...datos.etiquetaIds],
    fuente: { ...datos.fuente },
    seo: { ...datos.seo }
  }
  bloques.value = convertirDocumentoABloques(datos.documento)
}

function extraerDatosDetalle(
  detalle: ArticuloDetalleEditorial
): DatosEditorArticulo {
  return {
    titulo: detalle.titulo,
    slug: detalle.slug,
    resumen: detalle.resumen,
    tipo: detalle.tipo,
    categoriaId: detalle.categoriaId,
    portadaId: detalle.portadaId,
    temaIds: [...detalle.temaIds],
    etiquetaIds: [...detalle.etiquetaIds],
    documento: detalle.documento,
    fuente: { ...detalle.fuente },
    seo: { ...detalle.seo }
  }
}

function inicializarEditor(detalle: ArticuloDetalleEditorial) {
  const datosBase = extraerDatosDetalle(detalle)
  inicializando.value = true
  aplicarDatos(datosBase)
  portadaSeleccionada.value = detalle.portada
  versionBloqueo.value = detalle.versionBloqueo
  referenciaGuardada.value = serializarDatos(datosBase)
  cambiosPendientes.value = false
  conflictoVersion.value = false
  nextTick(() => {
    inicializando.value = false
  })
}

watch(articulo, (detalle) => {
  if (detalle && !formulario.value) inicializarEditor(detalle)
}, { immediate: true })

function programarAutoguardado() {
  if (!import.meta.client || !puedeEditar.value || !cambiosPendientes.value) return

  if (temporizadorAutoguardado) clearTimeout(temporizadorAutoguardado)
  temporizadorAutoguardado = setTimeout(realizarAutoguardado, 2500)
}

watch([formulario, bloques], () => {
  if (inicializando.value || !datosActuales.value) return

  cambiosPendientes.value = serializarDatos(datosActuales.value)
    !== referenciaGuardada.value
  mensajeEstado.value = ''
  errorGuardado.value = ''
  programarAutoguardado()
}, { deep: true })

async function realizarAutoguardado() {
  if (
    !datosActuales.value
    || !cambiosPendientes.value
    || guardando.value
    || autoguardando.value
  ) return

  autoguardando.value = true

  try {
    const respuesta = await $fetch<{ actualizadoEn: string }>(
      `/api/admin/contenidos/${articuloId.value}/autoguardado`,
      {
        method: 'PUT',
        body: {
          versionBase: versionBloqueo.value,
          datos: datosActuales.value
        }
      }
    )
    ultimoAutoguardado.value = respuesta.actualizadoEn
  } catch {
    errorGuardado.value = 'No se pudo completar el autoguardado.'
  } finally {
    autoguardando.value = false
  }
}

function obtenerMensajePeticion(errorPeticion: unknown): string {
  const errorConDatos = errorPeticion as {
    status?: number
    statusCode?: number
    data?: { statusMessage?: string }
    statusMessage?: string
  }
  const codigo = errorConDatos.status || errorConDatos.statusCode

  if (codigo === 409) {
    conflictoVersion.value = true
  }

  return errorConDatos.data?.statusMessage
    || errorConDatos.statusMessage
    || 'No se pudo guardar el contenido.'
}

async function guardarCambios() {
  if (!datosActuales.value || !puedeEditar.value) return

  const validacion = esquemaDatosEditorArticulo.safeParse(datosActuales.value)

  if (!validacion.success) {
    errorGuardado.value = validacion.error.issues[0]?.message
      || 'Revisa los campos antes de guardar.'
    return
  }

  if (temporizadorAutoguardado) clearTimeout(temporizadorAutoguardado)
  guardando.value = true
  errorGuardado.value = ''
  conflictoVersion.value = false

  await ejecutarConBloqueo(
    `guardar-articulo:${articuloId.value}`,
    'Guardando borrador',
    async () => {
      try {
        const respuesta = await $fetch<ResultadoGuardadoEditorial>(
          `/api/admin/contenidos/${articuloId.value}`,
          {
            method: 'PUT',
            body: {
              ...validacion.data,
              versionBloqueo: versionBloqueo.value,
              notaCambio: notaCambio.value
            }
          }
        )

        versionBloqueo.value = respuesta.versionBloqueo
        inicializando.value = true
        aplicarDatos(validacion.data)
        referenciaGuardada.value = serializarDatos(validacion.data)
        cambiosPendientes.value = false
        notaCambio.value = ''
        ultimoAutoguardado.value = ''
        mensajeEstado.value = 'Cambios guardados'
        nextTick(() => {
          inicializando.value = false
        })

        if (articulo.value) {
          articulo.value = {
            ...articulo.value,
            ...validacion.data,
            versionBloqueo: respuesta.versionBloqueo,
            actualizadoEn: respuesta.actualizadoEn,
            autoguardado: null
          }
        }

        await recargarVersiones()
      } catch (errorPeticion: unknown) {
        errorGuardado.value = obtenerMensajePeticion(errorPeticion)
      } finally {
        guardando.value = false
      }
    }
  )
}

function regenerarSlug() {
  if (!formulario.value) return
  formulario.value.slug = crearSlugEditorial(formulario.value.titulo)
}

function alternarId(lista: string[], id: string, activo: boolean): string[] {
  return activo
    ? [...new Set([...lista, id])]
    : lista.filter(valor => valor !== id)
}

function actualizarTema(id: string, activo: boolean) {
  if (!formulario.value) return
  formulario.value.temaIds = alternarId(formulario.value.temaIds, id, activo)
}

function actualizarEtiqueta(id: string, activo: boolean) {
  if (!formulario.value) return
  formulario.value.etiquetaIds = alternarId(
    formulario.value.etiquetaIds,
    id,
    activo
  )
}

async function recuperarAutoguardado() {
  const articuloActual = articulo.value
  const autoguardado = articuloActual?.autoguardado
  if (!articuloActual || !autoguardado) return

  aplicarDatos(autoguardado.datos)
  await cargarPortada(autoguardado.datos.portadaId)
  articulo.value = { ...articuloActual, autoguardado: null }
  cambiosPendientes.value = true
  mensajeEstado.value = 'Autoguardado recuperado'
  programarAutoguardado()
}

async function cargarPortada(portadaId: string | null) {
  if (!portadaId) {
    portadaSeleccionada.value = null
    return
  }

  if (portadaSeleccionada.value?.id === portadaId) return

  try {
    portadaSeleccionada.value = await $fetch<MedioEditorial>(
      `/api/admin/media/${portadaId}`
    )
  } catch {
    portadaSeleccionada.value = null
  }
}

function seleccionarPortada(medio: MedioEditorial) {
  if (!formulario.value) return
  formulario.value.portadaId = medio.id
  portadaSeleccionada.value = medio
  selectorPortadaAbierto.value = false
}

function quitarPortada() {
  if (!formulario.value) return
  formulario.value.portadaId = null
  portadaSeleccionada.value = null
}

function abrirSubidaDesdeSelector() {
  selectorPortadaAbierto.value = false
  modalSubidaMedioAbierto.value = true
}

function usarMedioSubido(medio: MedioEditorial) {
  modalSubidaMedioAbierto.value = false
  seleccionarPortada(medio)
}

async function descartarAutoguardado() {
  await ejecutarConBloqueo(
    `descartar-autoguardado:${articuloId.value}`,
    'Descartando cambios temporales',
    async () => {
      await $fetch(`/api/admin/contenidos/${articuloId.value}/autoguardado`, {
        method: 'DELETE'
      })

      if (articulo.value) {
        articulo.value = { ...articulo.value, autoguardado: null }
      }
    }
  )
}

async function realizarTransicion(entrada: EntradaTransicionEditorial) {
  if (cambiosPendientes.value) {
    errorGuardado.value = 'Guarda los cambios pendientes antes de cambiar el estado.'
    return
  }

  errorGuardado.value = ''
  guardando.value = true

  await ejecutarConBloqueo(
    `transicion-editorial:${articuloId.value}`,
    'Actualizando flujo editorial',
    async () => {
      try {
        await $fetch(`/api/admin/contenidos/${articuloId.value}/transicion`, {
          method: 'POST',
          body: entrada
        })
        formulario.value = null
        await recargarArticulo()
        if (articulo.value) inicializarEditor(articulo.value)
        mensajeEstado.value = 'Estado editorial actualizado'
      } catch (errorPeticion: unknown) {
        errorGuardado.value = obtenerMensajePeticion(errorPeticion)
      } finally {
        guardando.value = false
      }
    }
  )
}

async function agregarComentarioRevision(mensaje: string) {
  errorGuardado.value = ''

  try {
    const comentario = await $fetch<ComentarioRevisionEditorial>(
      `/api/admin/contenidos/${articuloId.value}/comentarios`,
      {
        method: 'POST',
        body: { mensaje }
      }
    )

    if (flujo.value) {
      flujo.value = {
        ...flujo.value,
        comentarios: [comentario, ...flujo.value.comentarios]
      }
    }
    mensajeEstado.value = 'Comentario agregado'
  } catch (errorPeticion: unknown) {
    errorGuardado.value = obtenerMensajePeticion(errorPeticion)
  }
}

async function recargarTrasConflicto() {
  await ejecutarConBloqueo(
    `recargar-articulo:${articuloId.value}`,
    'Cargando la versión más reciente',
    async () => {
      formulario.value = null
      await recargarArticulo()
      if (articulo.value) inicializarEditor(articulo.value)
    }
  )
}

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
    .format(new Date(fecha))
    .replace(/[\u00a0\u202f]/g, ' ')
}

onBeforeUnmount(() => {
  if (temporizadorAutoguardado) clearTimeout(temporizadorAutoguardado)
})
</script>

<template>
  <div class="vista-panel-editorial vista-editor-contenido">
    <div v-if="status === 'pending'" class="esqueleto-editor-contenido" aria-label="Cargando editor">
      <span v-for="indice in 8" :key="indice" />
    </div>

    <section v-else-if="error || !articulo || !formulario" class="estado-vacio-panel">
      <AlertTriangle aria-hidden="true" />
      <h1>No pudimos abrir el contenido</h1>
      <p>Comprueba que el borrador exista y que tu cuenta tenga acceso.</p>
      <NuxtLink class="boton-editorial-secundario" to="/admin/contenidos">
        <ChevronLeft aria-hidden="true" />
        Volver a contenidos
      </NuxtLink>
    </section>

    <template v-else>
      <header class="barra-superior-editor">
        <div class="identidad-editor-contenido">
          <NuxtLink
            to="/admin/contenidos"
            class="boton-icono-editorial"
            title="Volver a contenidos"
            aria-label="Volver a contenidos"
          >
            <ChevronLeft aria-hidden="true" />
          </NuxtLink>
          <div>
            <span class="estado-contenido" :data-estado="articulo.estado">
              {{ etiquetasEstadoContenido[articulo.estado] }}
            </span>
            <p>Versión {{ versionBloqueo }}</p>
          </div>
        </div>

        <div class="estado-persistencia-editor" aria-live="polite">
          <span v-if="guardando"><RefreshCw class="icono-girando" /> Guardando</span>
          <span v-else-if="autoguardando"><Clock3 /> Autoguardando</span>
          <span v-else-if="mensajeEstado"><Check /> {{ mensajeEstado }}</span>
          <span v-else-if="cambiosPendientes"><Clock3 /> Cambios pendientes</span>
          <span v-else><ShieldCheck /> Todo guardado</span>
        </div>

        <div class="acciones-principales-editor">
          <button
            class="boton-editorial-secundario"
            type="button"
            @click="vistaPreviaAbierta = true"
          >
            <Eye aria-hidden="true" />
            <span>Vista previa</span>
          </button>
          <button
            class="boton-editorial-principal"
            type="button"
            :disabled="!puedeEditar || guardando || !cambiosPendientes"
            @click="guardarCambios"
          >
            <Save aria-hidden="true" />
            <span>Guardar</span>
          </button>
        </div>
      </header>

      <div
        v-if="hayAutoguardadoRecuperable"
        class="aviso-recuperacion-editorial"
        role="status"
      >
        <FileClock aria-hidden="true" />
        <div>
          <strong>Hay cambios sin guardar</strong>
          <span>{{ formatearFecha(articulo.autoguardado!.actualizadoEn) }}</span>
        </div>
        <button type="button" @click="recuperarAutoguardado">Recuperar</button>
        <button type="button" @click="descartarAutoguardado">Descartar</button>
      </div>

      <div v-if="conflictoVersion" class="aviso-conflicto-editorial" role="alert">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Este contenido cambió en otra sesión</strong>
          <span>Recarga la versión más reciente antes de continuar.</span>
        </div>
        <button type="button" @click="recargarTrasConflicto">
          <RotateCcw aria-hidden="true" />
          Recargar
        </button>
      </div>

      <p v-else-if="errorGuardado" class="aviso-error-editorial" role="alert">
        {{ errorGuardado }}
      </p>

      <div class="rejilla-editor-contenido">
        <main class="columna-principal-editor">
          <section class="encabezado-documento-editor">
            <label for="titulo-articulo">Título</label>
            <textarea
              id="titulo-articulo"
              v-model="formulario.titulo"
              rows="2"
              maxlength="160"
              :disabled="!puedeEditar"
              placeholder="La historia que vamos a contar"
            />
            <span>{{ formulario.titulo.length }}/160</span>

            <label for="resumen-articulo">Resumen</label>
            <textarea
              id="resumen-articulo"
              v-model="formulario.resumen"
              rows="3"
              maxlength="320"
              :disabled="!puedeEditar"
              placeholder="Contexto breve y enfoque de la publicación"
            />
            <span>{{ formulario.resumen.length }}/320</span>
          </section>

          <EditorBloquesContenido
            v-model="bloques"
            :articulo-id-actual="articuloId"
            :deshabilitado="!puedeEditar"
          />

          <section class="panel-fuente-editor">
            <header class="cabecera-seccion-editor">
              <div>
                <p class="etiqueta-panel">Trazabilidad</p>
                <h2>Fuente y créditos</h2>
              </div>
              <Link2 aria-hidden="true" />
            </header>

            <div class="rejilla-campos-editor">
              <label>
                URL original
                <input
                  v-model="formulario.fuente.url"
                  type="url"
                  maxlength="2048"
                  placeholder="https://"
                  :disabled="!puedeEditar"
                >
              </label>
              <label>
                Medio o plataforma
                <input
                  v-model="formulario.fuente.nombre"
                  type="text"
                  maxlength="160"
                  placeholder="Nombre de la fuente"
                  :disabled="!puedeEditar"
                >
              </label>
              <label>
                Autor original
                <input
                  v-model="formulario.fuente.autor"
                  type="text"
                  maxlength="160"
                  placeholder="Autor o cuenta"
                  :disabled="!puedeEditar"
                >
              </label>
              <label class="campo-ancho-completo">
                Créditos
                <textarea
                  v-model="formulario.fuente.creditos"
                  rows="3"
                  maxlength="500"
                  placeholder="Créditos editoriales y audiovisuales"
                  :disabled="!puedeEditar"
                />
              </label>
            </div>
          </section>
        </main>

        <aside class="columna-lateral-editor">
          <section class="panel-configuracion-editor">
            <h2>Publicación</h2>
            <label>
              Tipo
              <select v-model="formulario.tipo" :disabled="!puedeEditar">
                <option value="breve">Breve</option>
                <option value="noticia">Noticia</option>
                <option value="analisis">Análisis</option>
                <option value="blog">Blog</option>
                <option value="informe">Informe</option>
                <option value="opinion">Opinión</option>
                <option value="especial">Especial</option>
              </select>
            </label>
            <label>
              Sección
              <select v-model="formulario.categoriaId" :disabled="!puedeEditar">
                <option :value="null">Sin definir</option>
                <option
                  v-for="categoria in taxonomias?.categorias || []"
                  :key="categoria.id"
                  :value="categoria.id"
                >
                  {{ categoria.nombre }}
                </option>
              </select>
            </label>
            <label>
              Slug
              <div class="control-slug-editor">
                <input
                  v-model="formulario.slug"
                  type="text"
                  maxlength="120"
                  :disabled="!puedeEditar"
                >
                <button
                  type="button"
                  title="Regenerar slug"
                  aria-label="Regenerar slug"
                  :disabled="!puedeEditar"
                  @click="regenerarSlug"
                >
                  <RefreshCw aria-hidden="true" />
                </button>
              </div>
            </label>

            <div class="metricas-documento-editor">
              <span><strong>{{ totalPalabras }}</strong> palabras</span>
              <span><strong>{{ minutosLectura }}</strong> min</span>
            </div>
          </section>

          <section class="panel-configuracion-editor panel-portada-editor">
            <header>
              <h2>Portada</h2>
              <Image aria-hidden="true" />
            </header>

            <figure v-if="portadaSeleccionada">
              <img
                :src="portadaSeleccionada.urlPublica"
                :alt="portadaSeleccionada.esDecorativa
                  ? ''
                  : portadaSeleccionada.textoAlternativo"
                width="640"
                height="360"
              >
              <figcaption>
                <strong>{{ portadaSeleccionada.titulo }}</strong>
                <span>
                  {{ portadaSeleccionada.ancho }} × {{ portadaSeleccionada.alto }}
                </span>
              </figcaption>
            </figure>

            <div v-else class="portada-vacia-editor">
              <ImagePlus aria-hidden="true" />
              <span>Elige una imagen para representar la historia.</span>
            </div>

            <div class="acciones-portada-editor">
              <button
                class="boton-editorial-secundario"
                type="button"
                :disabled="!puedeEditar"
                @click="selectorPortadaAbierto = true"
              >
                <ImagePlus aria-hidden="true" />
                {{ portadaSeleccionada ? 'Cambiar' : 'Elegir portada' }}
              </button>
              <button
                v-if="portadaSeleccionada"
                type="button"
                :disabled="!puedeEditar"
                @click="quitarPortada"
              >
                Quitar
              </button>
            </div>
          </section>

          <section class="panel-configuracion-editor">
            <h2>Temas</h2>
            <div v-if="taxonomias?.temas.length" class="opciones-taxonomia-editor">
              <label v-for="tema in taxonomias.temas" :key="tema.id">
                <input
                  type="checkbox"
                  :checked="formulario.temaIds.includes(tema.id)"
                  :disabled="!puedeEditar"
                  @change="actualizarTema(
                    tema.id,
                    ($event.target as HTMLInputElement).checked
                  )"
                >
                <span>{{ tema.nombre }}</span>
              </label>
            </div>
            <p v-else class="texto-secundario-editor">Sin temas disponibles</p>

            <h2>Etiquetas internas</h2>
            <div class="opciones-taxonomia-editor">
              <label
                v-for="etiqueta in taxonomias?.etiquetas || []"
                :key="etiqueta.id"
              >
                <input
                  type="checkbox"
                  :checked="formulario.etiquetaIds.includes(etiqueta.id)"
                  :disabled="!puedeEditar"
                  @change="actualizarEtiqueta(
                    etiqueta.id,
                    ($event.target as HTMLInputElement).checked
                  )"
                >
                <i :style="{ backgroundColor: etiqueta.color }" aria-hidden="true" />
                <span>{{ etiqueta.nombre }}</span>
              </label>
            </div>
          </section>

          <section class="panel-configuracion-editor panel-seo-editor">
            <header>
              <h2>SEO y distribución</h2>
              <Search aria-hidden="true" />
            </header>
            <label>
              Título SEO
              <input
                v-model="formulario.seo.titulo"
                type="text"
                maxlength="70"
                :disabled="!puedeEditar"
                :placeholder="formulario.titulo"
              >
              <span>{{ formulario.seo.titulo.length }}/70</span>
            </label>
            <label>
              Descripción SEO
              <textarea
                v-model="formulario.seo.descripcion"
                rows="3"
                maxlength="170"
                :disabled="!puedeEditar"
                :placeholder="formulario.resumen"
              />
              <span>{{ formulario.seo.descripcion.length }}/170</span>
            </label>
            <label>
              Texto para redes
              <textarea
                v-model="formulario.seo.textoSocial"
                rows="3"
                maxlength="300"
                :disabled="!puedeEditar"
                placeholder="Copy base para distribución"
              />
            </label>

            <div class="vista-serp-editor">
              <span>pont3la10.com › {{ formulario.slug }}</span>
              <strong>{{ formulario.seo.titulo || formulario.titulo }}</strong>
              <p>{{ formulario.seo.descripcion || formulario.resumen }}</p>
            </div>
          </section>

          <PanelFlujoEditorial
            v-if="flujo"
            :flujo="flujo"
            :version-bloqueo="versionBloqueo"
            :bloqueado="guardando || cambiosPendientes"
            :nivel-aal="contextoEditorial?.nivelAal || undefined"
            @transicionar="realizarTransicion"
            @comentar="agregarComentarioRevision"
          />

          <section class="panel-configuracion-editor">
            <h2>Nota de versión</h2>
            <textarea
              v-model="notaCambio"
              rows="2"
              maxlength="160"
              placeholder="Qué cambió en este guardado"
              :disabled="!puedeEditar"
            />
          </section>

          <section class="panel-configuracion-editor historial-versiones-editor">
            <header>
              <h2>Historial</h2>
              <FileClock aria-hidden="true" />
            </header>
            <ol>
              <li v-for="version in versiones" :key="version.id">
                <strong>Versión {{ version.numero }}</strong>
                <span>{{ version.nota || version.titulo }}</span>
                <time :datetime="version.creadoEn">
                  {{ formatearFecha(version.creadoEn) }}
                </time>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      <SelectorPortadaEditorial
        v-if="selectorPortadaAbierto"
        :seleccionado-id="formulario.portadaId"
        :puede-subir="tienePermiso('media.subir')"
        @cerrar="selectorPortadaAbierto = false"
        @seleccionar="seleccionarPortada"
        @solicitar-subida="abrirSubidaDesdeSelector"
      />

      <ModalSubirMedio
        v-if="modalSubidaMedioAbierto"
        @cerrar="modalSubidaMedioAbierto = false"
        @subido="usarMedioSubido"
      />

      <div
        v-if="vistaPreviaAbierta && datosActuales"
        class="fondo-modal-editorial fondo-vista-previa"
        role="presentation"
        @mousedown.self="vistaPreviaAbierta = false"
      >
        <section
          class="modal-vista-previa"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-vista-previa"
        >
          <header>
            <div>
              <p class="etiqueta-panel">Vista previa</p>
              <h2 id="titulo-vista-previa">Lectura del artículo</h2>
            </div>
            <button
              type="button"
              title="Cerrar vista previa"
              aria-label="Cerrar vista previa"
              @click="vistaPreviaAbierta = false"
            >
              <X aria-hidden="true" />
            </button>
          </header>
          <VistaPreviaArticulo
            :datos="datosActuales"
            :bloques="bloques"
            :nombre-categoria="categoriaActual?.nombre || ''"
            :portada="portadaSeleccionada"
          />
        </section>
      </div>

      <span v-if="ultimoAutoguardado" class="sr-only" aria-live="polite">
        Autoguardado completado a las {{ formatearFecha(ultimoAutoguardado) }}
      </span>
    </template>
  </div>
</template>
