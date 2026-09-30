<script setup lang="ts">
import { Check, ExternalLink, FilePlus2, Layers, LoaderCircle, Send, Trash2 } from '@lucide/vue'
import type { HubEditorialResumen, TipoHubPublicoEditorial } from '~/types/contenidoEditorial'
import { tiposHubPublicoEditorial } from '~/utils/editorial/hubs'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'hub.ver'
})

useSeoMeta({ title: 'Hubs públicos | Pont3la10', robots: 'noindex, nofollow' })

const { tienePermiso } = useContextoEditorial()
const { data: hubs, status, error, refresh } = await useFetch<HubEditorialResumen[]>('/api/admin/hubs', {
  default: () => []
})

const idActual = ref('')
const titulo = ref('')
const slug = ref('')
const tipo = ref<TipoHubPublicoEditorial>('topic')
const descripcion = ref('')
const cuerpo = ref('')
const tituloSeo = ref('')
const descripcionSeo = ref('')
const modulosJson = ref('[]')
const guardando = ref(false)
const errorFormulario = ref('')
const mensaje = ref('')
const publicandoId = ref('')

const hubActual = computed(() => hubs.value.find(hub => hub.id === idActual.value) || null)
const estaEditandoBorrador = computed(() => !idActual.value || hubActual.value?.estado === 'draft')
const puedeGestionar = computed(() => tienePermiso('hub.gestionar'))
const tiposHubEtiqueta: Record<TipoHubPublicoEditorial, string> = {
  topic: 'Tema',
  competition: 'Competición',
  player_collection: 'Colección de jugadores',
  technology: 'Tecnología',
  gaming: 'Gaming'
}

function limpiarFormulario() {
  idActual.value = ''
  titulo.value = ''
  slug.value = ''
  tipo.value = 'topic'
  descripcion.value = ''
  cuerpo.value = ''
  tituloSeo.value = ''
  descripcionSeo.value = ''
  modulosJson.value = '[]'
  errorFormulario.value = ''
  mensaje.value = ''
}

function seleccionarHub(hub: HubEditorialResumen) {
  idActual.value = hub.id
  titulo.value = hub.titulo
  slug.value = hub.slug
  tipo.value = hub.tipo
  descripcion.value = hub.descripcion
  cuerpo.value = hub.cuerpo
  tituloSeo.value = hub.tituloSeo
  descripcionSeo.value = hub.descripcionSeo
  modulosJson.value = JSON.stringify(hub.modulos, null, 2)
  errorFormulario.value = ''
  mensaje.value = ''
}

function obtenerDatosFormulario() {
  let modulos: unknown
  try {
    modulos = JSON.parse(modulosJson.value)
  } catch {
    throw new Error('Los módulos deben ser JSON válido.')
  }

  return {
    titulo: titulo.value.trim(),
    slug: slug.value.trim(),
    tipo: tipo.value,
    descripcion: descripcion.value.trim(),
    cuerpo: cuerpo.value.trim(),
    tituloSeo: tituloSeo.value.trim(),
    descripcionSeo: descripcionSeo.value.trim(),
    modulos
  }
}

async function guardarHub() {
  if (!puedeGestionar.value || guardando.value || !estaEditandoBorrador.value) return
  guardando.value = true
  errorFormulario.value = ''
  mensaje.value = ''

  try {
    const datos = obtenerDatosFormulario()
    const guardado = await $fetch<HubEditorialResumen>(
      idActual.value ? `/api/admin/hubs/${idActual.value}` : '/api/admin/hubs',
      { method: idActual.value ? 'PATCH' : 'POST', body: datos }
    )
    await refresh()
    seleccionarHub(guardado)
    mensaje.value = 'Borrador guardado.'
  } catch (errorPeticion: unknown) {
    const errorConDatos = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
    errorFormulario.value = errorConDatos.data?.statusMessage
      || errorConDatos.statusMessage
      || (errorPeticion instanceof Error ? errorPeticion.message : 'No se pudo guardar el hub.')
  } finally {
    guardando.value = false
  }
}

async function cambiarEstado(estado: 'published' | 'draft' | 'archived') {
  const id = idActual.value
  if (!id || publicandoId.value) return
  if (estado === 'archived' && !window.confirm(`¿Archivar “${hubActual.value?.titulo || 'este hub'}”?`)) return
  publicandoId.value = id
  errorFormulario.value = ''
  mensaje.value = ''

  try {
    const actualizado = await $fetch<HubEditorialResumen>(`/api/admin/hubs/${id}/estado`, {
      method: 'PATCH',
      body: { estado }
    })
    await refresh()
    seleccionarHub(actualizado)
    mensaje.value = estado === 'published'
      ? 'Hub publicado.'
      : estado === 'archived'
        ? 'Hub archivado.'
        : 'Hub retirado del público.'
  } catch (errorPeticion: unknown) {
    const errorConDatos = errorPeticion as { data?: { statusMessage?: string }, statusMessage?: string }
    errorFormulario.value = errorConDatos.data?.statusMessage
      || errorConDatos.statusMessage
      || 'No se pudo cambiar el estado del hub.'
  } finally {
    publicandoId.value = ''
  }
}

async function eliminarHub(hub: HubEditorialResumen) {
  if (!puedeGestionar.value || hub.estado === 'published') return
  if (!window.confirm(`¿Eliminar el borrador “${hub.titulo}”?`)) return
  try {
    await $fetch(`/api/admin/hubs/${hub.id}`, { method: 'DELETE' })
    if (idActual.value === hub.id) limpiarFormulario()
    mensaje.value = 'Borrador eliminado.'
    await refresh()
  } catch {
    errorFormulario.value = 'No se pudo eliminar el borrador.'
  }
}
</script>

<template>
  <div class="vista-panel-editorial vista-hubs-publicos">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Descubrimiento y SEO</p>
        <h1>Hubs públicos</h1>
        <p>Organiza páginas temáticas independientes de las categorías y etiquetas.</p>
      </div>
      <button
        v-if="puedeGestionar"
        class="boton-editorial-secundario"
        type="button"
        @click="limpiarFormulario"
      >
        <FilePlus2 aria-hidden="true" />
        Nuevo borrador
      </button>
    </header>

    <div class="superficie-hubs-editorial">
      <section class="lista-taxonomias-panel" aria-labelledby="titulo-lista-hubs">
        <header>
          <div>
            <p class="etiqueta-panel">Biblioteca</p>
            <h2 id="titulo-lista-hubs">{{ hubs.length }} hubs</h2>
          </div>
        </header>

        <div v-if="status === 'pending'" class="lista-esqueleto-taxonomias">
          <span v-for="indice in 4" :key="indice" />
        </div>
        <div v-else-if="error" class="estado-vacio-panel">
          <Layers aria-hidden="true" />
          <h2>No pudimos cargar los hubs</h2>
          <button class="boton-editorial-secundario" type="button" @click="() => refresh()">
            Reintentar
          </button>
        </div>
        <div v-else-if="!hubs.length" class="estado-vacio-panel">
          <Layers aria-hidden="true" />
          <h2>Aún no hay hubs</h2>
          <p>Los hubs se crean como borradores y requieren contenido suficiente para publicarse.</p>
        </div>
        <ul v-else class="lista-taxonomias lista-hubs-editorial">
          <li v-for="hub in hubs" :key="hub.id">
            <button class="fila-hub-editorial" type="button" @click="seleccionarHub(hub)">
              <span class="icono-fila-hub"><Layers aria-hidden="true" /></span>
              <span>
                <strong>{{ hub.titulo }}</strong>
                <small>/{{ hub.slug }} · {{ tiposHubEtiqueta[hub.tipo] }}</small>
              </span>
              <em :class="`estado-hub-${hub.estado}`">{{ hub.estado === 'published' ? 'Publicado' : hub.estado === 'draft' ? 'Borrador' : 'Archivado' }}</em>
            </button>
            <button
              v-if="puedeGestionar && hub.estado !== 'published'"
              class="boton-eliminar-hub"
              type="button"
              :aria-label="`Eliminar borrador ${hub.titulo}`"
              @click="eliminarHub(hub)"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>

      <section class="formulario-taxonomia-panel formulario-hub-panel" aria-labelledby="titulo-formulario-hub">
        <header>
          <span><Layers aria-hidden="true" /></span>
          <div>
            <p class="etiqueta-panel">{{ idActual ? (hubActual?.estado || 'borrador') : 'Nuevo' }}</p>
            <h2 id="titulo-formulario-hub">{{ idActual ? 'Editar hub' : 'Crear hub' }}</h2>
          </div>
        </header>

        <form class="formulario-editorial" @submit.prevent="guardarHub">
          <fieldset :disabled="!puedeGestionar || !estaEditandoBorrador || guardando">
            <label class="campo-editorial campo-editorial-completo">
              <span>Título</span>
              <input v-model="titulo" type="text" maxlength="140" minlength="8" required>
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Slug público</span>
              <input v-model="slug" type="text" maxlength="100" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="tema-editorial" required>
              <small>Ruta raíz, por ejemplo /colombianos-en-europa.</small>
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Tipo de hub</span>
              <select v-model="tipo">
                <option v-for="tipoHub in tiposHubPublicoEditorial" :key="tipoHub" :value="tipoHub">
                  {{ tiposHubEtiqueta[tipoHub] }}
                </option>
              </select>
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Descripción pública</span>
              <textarea v-model="descripcion" maxlength="320" rows="3" required />
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Cuerpo introductorio</span>
              <textarea v-model="cuerpo" maxlength="20000" rows="7" />
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Módulos (JSON)</span>
              <textarea v-model="modulosJson" rows="12" spellcheck="false" />
              <small>Tipos: texto, enlaces y articulos. La publicación exige un feed con contenido.</small>
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Título SEO</span>
              <input v-model="tituloSeo" type="text" maxlength="160">
            </label>
            <label class="campo-editorial campo-editorial-completo">
              <span>Descripción SEO</span>
              <textarea v-model="descripcionSeo" maxlength="320" rows="3" />
            </label>
          </fieldset>

          <p v-if="errorFormulario" class="error-formulario-editorial" role="alert">{{ errorFormulario }}</p>
          <p v-if="mensaje" class="mensaje-formulario-editorial" role="status">{{ mensaje }}</p>

          <div class="acciones-hub-editorial">
            <button
              v-if="puedeGestionar && estaEditandoBorrador"
              class="boton-editorial-principal"
              type="submit"
              :disabled="guardando || titulo.trim().length < 8 || !slug"
            >
              <LoaderCircle v-if="guardando" class="icono-girando" aria-hidden="true" />
              <Check v-else aria-hidden="true" />
              {{ guardando ? 'Guardando…' : 'Guardar borrador' }}
            </button>
            <button
              v-if="idActual && hubActual?.estado === 'draft' && tienePermiso('contenido.publicar')"
              class="boton-editorial-principal"
              type="button"
              :disabled="Boolean(publicandoId)"
              @click="cambiarEstado('published')"
            >
              <Send aria-hidden="true" />
              Publicar con MFA
            </button>
            <button
              v-if="idActual && hubActual?.estado === 'published' && tienePermiso('contenido.publicar')"
              class="boton-editorial-secundario"
              type="button"
              :disabled="Boolean(publicandoId)"
              @click="cambiarEstado('draft')"
            >
              Retirar del público
            </button>
            <button
              v-if="idActual && ['draft', 'published'].includes(hubActual?.estado || '') && tienePermiso('contenido.archivar') && tienePermiso('contenido.publicar')"
              class="boton-editorial-secundario"
              type="button"
              :disabled="Boolean(publicandoId)"
              @click="cambiarEstado('archived')"
            >
              Archivar con MFA
            </button>
            <NuxtLink v-if="hubActual?.estado === 'published'" class="enlace-hub-publico" :to="`/${hubActual.slug}`" target="_blank">
              <ExternalLink aria-hidden="true" /> Ver página pública
            </NuxtLink>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
