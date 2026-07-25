<script setup lang="ts">
import {
  FolderTree,
  Hash,
  LoaderCircle,
  Plus,
  RotateCcw,
  Tags
} from '@lucide/vue'
import type {
  TaxonomiasEditoriales,
  TipoTaxonomiaEditorial
} from '~/types/contenidoEditorial'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'taxonomia.ver'
})

useSeoMeta({
  title: 'Taxonomías | Pont3la10',
  robots: 'noindex, nofollow'
})

const { tienePermiso } = useContextoEditorial()
const tipoActivo = ref<TipoTaxonomiaEditorial>('categoria')
const nombre = ref('')
const descripcion = ref('')
const color = ref('#174EA6')
const guardando = ref(false)
const errorCreacion = ref('')
const mensajeExito = ref('')

const {
  data: taxonomias,
  status,
  error,
  refresh
} = await useFetch<TaxonomiasEditoriales>('/api/admin/taxonomias')

const configuracionTipos = [
  {
    tipo: 'categoria' as const,
    etiqueta: 'Secciones',
    descripcion: 'Organización principal visible en el sitio.',
    icono: FolderTree
  },
  {
    tipo: 'tema' as const,
    etiqueta: 'Temas',
    descripcion: 'Conceptos públicos para relacionar historias.',
    icono: Hash
  },
  {
    tipo: 'etiqueta' as const,
    etiqueta: 'Etiquetas internas',
    descripcion: 'Control operativo que nunca se publica.',
    icono: Tags
  }
]

const elementosActivos = computed(() => {
  if (tipoActivo.value === 'categoria') return taxonomias.value?.categorias || []
  if (tipoActivo.value === 'tema') return taxonomias.value?.temas || []
  return taxonomias.value?.etiquetas || []
})

watch(tipoActivo, () => {
  nombre.value = ''
  descripcion.value = ''
  color.value = '#174EA6'
  errorCreacion.value = ''
  mensajeExito.value = ''
})

async function crearTaxonomia() {
  if (nombre.value.trim().length < 2 || guardando.value) return
  guardando.value = true
  errorCreacion.value = ''
  mensajeExito.value = ''

  try {
    await $fetch('/api/admin/taxonomias', {
      method: 'POST',
      body: {
        tipo: tipoActivo.value,
        nombre: nombre.value.trim(),
        descripcion: descripcion.value.trim(),
        color: color.value
      }
    })

    mensajeExito.value = 'Taxonomía creada correctamente.'
    nombre.value = ''
    descripcion.value = ''
    color.value = '#174EA6'
    await refresh()
  } catch (errorPeticion: unknown) {
    const errorConDatos = errorPeticion as {
      data?: { statusMessage?: string }
      statusMessage?: string
    }
    errorCreacion.value = errorConDatos.data?.statusMessage
      || errorConDatos.statusMessage
      || 'No se pudo crear la taxonomía.'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="vista-panel-editorial vista-taxonomias">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Clasificación editorial</p>
        <h1>Taxonomías</h1>
        <p>Separa la navegación pública de las etiquetas privadas de operación.</p>
      </div>
    </header>

    <nav class="pestanas-taxonomias" aria-label="Tipos de taxonomía">
      <button
        v-for="configuracion in configuracionTipos"
        :key="configuracion.tipo"
        type="button"
        :class="{ activa: tipoActivo === configuracion.tipo }"
        @click="tipoActivo = configuracion.tipo"
      >
        <component :is="configuracion.icono" aria-hidden="true" />
        <span>
          <strong>{{ configuracion.etiqueta }}</strong>
          <small>{{ configuracion.descripcion }}</small>
        </span>
      </button>
    </nav>

    <div class="superficie-taxonomias">
      <section class="lista-taxonomias-panel">
        <header>
          <div>
            <p class="etiqueta-panel">
              {{ configuracionTipos.find(item => item.tipo === tipoActivo)?.etiqueta }}
            </p>
            <h2>{{ elementosActivos.length }} elementos</h2>
          </div>
        </header>

        <div v-if="status === 'pending'" class="lista-esqueleto-taxonomias">
          <span v-for="indice in 6" :key="indice" />
        </div>

        <div v-else-if="error" class="estado-vacio-panel">
          <RotateCcw aria-hidden="true" />
          <h2>No pudimos cargar las taxonomías</h2>
          <button class="boton-editorial-secundario" type="button" @click="() => refresh()">
            Reintentar
          </button>
        </div>

        <div v-else-if="!elementosActivos.length" class="estado-vacio-panel">
          <Tags aria-hidden="true" />
          <h2>Aún no hay elementos</h2>
          <p>Crea el primero desde el formulario lateral.</p>
        </div>

        <ul v-else class="lista-taxonomias">
          <li v-for="elemento in elementosActivos" :key="elemento.id">
            <span
              v-if="'color' in elemento"
              class="muestra-color-etiqueta"
              :style="{ backgroundColor: elemento.color }"
            />
            <component
              :is="tipoActivo === 'categoria' ? FolderTree : tipoActivo === 'tema' ? Hash : Tags"
              v-else
              aria-hidden="true"
            />
            <span>
              <strong>{{ elemento.nombre }}</strong>
              <small>/{{ elemento.slug }}</small>
            </span>
            <em>{{ ('activa' in elemento ? elemento.activa : elemento.activo) ? 'Activo' : 'Inactivo' }}</em>
          </li>
        </ul>
      </section>

      <aside
        v-if="tienePermiso('taxonomia.gestionar')"
        class="formulario-taxonomia-panel"
      >
        <header>
          <span><Plus aria-hidden="true" /></span>
          <div>
            <p class="etiqueta-panel">Nuevo elemento</p>
            <h2>Agregar taxonomía</h2>
          </div>
        </header>

        <form class="formulario-editorial" @submit.prevent="crearTaxonomia">
          <label class="campo-editorial campo-editorial-completo">
            <span>Nombre</span>
            <input
              v-model="nombre"
              type="text"
              maxlength="80"
              placeholder="Nombre editorial"
              required
            >
          </label>

          <label
            v-if="tipoActivo !== 'etiqueta'"
            class="campo-editorial campo-editorial-completo"
          >
            <span>Descripcion <em>Opcional</em></span>
            <textarea
              v-model="descripcion"
              maxlength="240"
              rows="4"
              placeholder="Uso y alcance de esta taxonomía."
            />
          </label>

          <label
            v-else
            class="campo-editorial campo-editorial-completo campo-color-editorial"
          >
            <span>Color interno</span>
            <div>
              <input v-model="color" type="color">
              <code>{{ color }}</code>
            </div>
          </label>

          <p v-if="errorCreacion" class="error-formulario-editorial" role="alert">
            {{ errorCreacion }}
          </p>
          <p v-if="mensajeExito" class="mensaje-formulario-editorial" role="status">
            {{ mensajeExito }}
          </p>

          <button
            class="boton-editorial-principal"
            type="submit"
            :disabled="nombre.trim().length < 2 || guardando"
          >
            <LoaderCircle
              v-if="guardando"
              class="icono-girando"
              aria-hidden="true"
            />
            <Plus v-else aria-hidden="true" />
            <span>{{ guardando ? 'Guardando...' : 'Agregar' }}</span>
          </button>
        </form>
      </aside>
    </div>
  </div>
</template>
