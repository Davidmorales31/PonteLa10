<script setup lang="ts">
import {
  FilePlus2,
  LoaderCircle,
  X
} from '@lucide/vue'
import type {
  CategoriaEditorial,
  TipoContenidoEditorial
} from '~/types/contenidoEditorial'
import {
  etiquetasTipoContenido,
  tiposContenidoEditorial
} from '~/utils/editorial/contenido'

interface EntradaBorradorFormulario {
  titulo: string
  resumen: string
  tipo: TipoContenidoEditorial
  categoriaId: string | null
}

const props = defineProps<{
  abierto: boolean
  categorias: CategoriaEditorial[]
  guardando: boolean
  error: string
}>()

const emit = defineEmits<{
  cerrar: []
  crear: [entrada: EntradaBorradorFormulario]
}>()

const formulario = reactive<EntradaBorradorFormulario>({
  titulo: '',
  resumen: '',
  tipo: 'noticia',
  categoriaId: null
})

const formularioValido = computed(() =>
  formulario.titulo.trim().length >= 8
  && formulario.titulo.trim().length <= 160
  && formulario.resumen.trim().length <= 320
)

watch(() => props.abierto, (abierto) => {
  if (!abierto) return
  formulario.titulo = ''
  formulario.resumen = ''
  formulario.tipo = 'noticia'
  formulario.categoriaId = null
})

function cerrar() {
  if (!props.guardando) emit('cerrar')
}

function crear() {
  if (!formularioValido.value || props.guardando) return
  emit('crear', {
    titulo: formulario.titulo.trim(),
    resumen: formulario.resumen.trim(),
    tipo: formulario.tipo,
    categoriaId: formulario.categoriaId
  })
}

function manejarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && props.abierto) cerrar()
}

onMounted(() => window.addEventListener('keydown', manejarTecla))
onBeforeUnmount(() => window.removeEventListener('keydown', manejarTecla))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="fondo-modal-editorial"
      role="presentation"
      @click.self="cerrar"
    >
      <section
        class="modal-editorial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-borrador"
      >
        <header class="cabecera-modal-editorial">
          <div>
            <span class="icono-modal-editorial">
              <FilePlus2 aria-hidden="true" />
            </span>
            <div>
              <p class="etiqueta-panel">Nuevo contenido</p>
              <h2 id="titulo-modal-borrador">Crear borrador</h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            title="Cerrar"
            :disabled="guardando"
            @click="cerrar"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form class="formulario-editorial" @submit.prevent="crear">
          <label class="campo-editorial campo-editorial-completo">
            <span>Título</span>
            <input
              v-model="formulario.titulo"
              type="text"
              maxlength="160"
              autocomplete="off"
              placeholder="La historia que vamos a contar"
              autofocus
              required
            >
            <small>{{ formulario.titulo.length }}/160</small>
          </label>

          <label class="campo-editorial">
            <span>Tipo de contenido</span>
            <select v-model="formulario.tipo">
              <option
                v-for="tipo in tiposContenidoEditorial"
                :key="tipo"
                :value="tipo"
              >
                {{ etiquetasTipoContenido[tipo] }}
              </option>
            </select>
          </label>

          <label class="campo-editorial">
            <span>Sección principal</span>
            <select v-model="formulario.categoriaId">
              <option :value="null">Sin definir</option>
              <option
                v-for="categoria in categorias"
                :key="categoria.id"
                :value="categoria.id"
              >
                {{ categoria.nombre }}
              </option>
            </select>
          </label>

          <label class="campo-editorial campo-editorial-completo">
            <span>Resumen <em>Opcional</em></span>
            <textarea
              v-model="formulario.resumen"
              maxlength="320"
              rows="4"
              placeholder="Contexto breve para reconocer el enfoque del borrador."
            />
            <small>{{ formulario.resumen.length }}/320</small>
          </label>

          <p v-if="error" class="error-formulario-editorial" role="alert">
            {{ error }}
          </p>

          <footer class="acciones-modal-editorial">
            <button
              class="boton-editorial-secundario"
              type="button"
              :disabled="guardando"
              @click="cerrar"
            >
              Cancelar
            </button>
            <button
              class="boton-editorial-principal"
              type="submit"
              :disabled="!formularioValido || guardando"
            >
              <LoaderCircle
                v-if="guardando"
                class="icono-girando"
                aria-hidden="true"
              />
              <FilePlus2 v-else aria-hidden="true" />
              <span>{{ guardando ? 'Creando...' : 'Crear borrador' }}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>
