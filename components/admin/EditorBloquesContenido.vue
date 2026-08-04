<script setup lang="ts">
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Heading2,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Plus,
  Quote,
  Trash2
} from '@lucide/vue'
import SelectorArticuloRelacionado from '~/components/admin/SelectorArticuloRelacionado.vue'
import type {
  BloqueEditorEditorial,
  TipoBloqueEditorEditorial
} from '~/types/contenidoEditorial'
import { crearBloqueEditorEditorial } from '~/utils/editorial/documento'

const props = defineProps<{
  modelValue: BloqueEditorEditorial[]
  articuloIdActual?: string
  deshabilitado?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [bloques: BloqueEditorEditorial[]]
}>()

const tiposBloque: Array<{
  tipo: TipoBloqueEditorEditorial
  etiqueta: string
}> = [
  { tipo: 'parrafo', etiqueta: 'Párrafo' },
  { tipo: 'encabezado2', etiqueta: 'Título H2' },
  { tipo: 'encabezado3', etiqueta: 'Título H3' },
  { tipo: 'cita', etiqueta: 'Cita' },
  { tipo: 'lista', etiqueta: 'Lista' },
  { tipo: 'listaNumerada', etiqueta: 'Lista numerada' },
  { tipo: 'articuloRelacionado', etiqueta: 'Noticia relacionada' }
]

function actualizarBloque(
  bloqueId: string,
  cambio: Partial<BloqueEditorEditorial>
) {
  emit('update:modelValue', props.modelValue.map(bloque => (
    bloque.id === bloqueId ? { ...bloque, ...cambio } : bloque
  )))
}

function agregarBloque(tipo: TipoBloqueEditorEditorial) {
  emit('update:modelValue', [
    ...props.modelValue,
    crearBloqueEditorEditorial(tipo)
  ])
}

function cambiarTipoBloque(bloqueId: string, tipo: TipoBloqueEditorEditorial) {
  actualizarBloque(bloqueId, {
    tipo,
    articuloRelacionado: tipo === 'articuloRelacionado' ? null : undefined
  })
}

function moverBloque(indice: number, direccion: -1 | 1) {
  const destino = indice + direccion

  if (destino < 0 || destino >= props.modelValue.length) return

  const bloques = [...props.modelValue]
  const [bloque] = bloques.splice(indice, 1)

  if (!bloque) return

  bloques.splice(destino, 0, bloque)
  emit('update:modelValue', bloques)
}

function eliminarBloque(bloqueId: string) {
  const bloques = props.modelValue.filter(bloque => bloque.id !== bloqueId)
  emit(
    'update:modelValue',
    bloques.length ? bloques : [crearBloqueEditorEditorial()]
  )
}

function filasBloque(tipo: TipoBloqueEditorEditorial): number {
  if (tipo === 'lista' || tipo === 'listaNumerada') return 4
  if (tipo === 'cita') return 3
  return 2
}
</script>

<template>
  <section class="editor-bloques" aria-labelledby="titulo-cuerpo-editorial">
    <header class="cabecera-seccion-editor">
      <div>
        <p class="etiqueta-panel">Cuerpo</p>
        <h2 id="titulo-cuerpo-editorial">Construye la historia</h2>
      </div>

      <div class="acciones-agregar-bloque" aria-label="Agregar bloque">
        <button
          type="button"
          title="Agregar párrafo"
          aria-label="Agregar párrafo"
          :disabled="deshabilitado"
          @click="agregarBloque('parrafo')"
        >
          <Pilcrow aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Agregar encabezado"
          aria-label="Agregar encabezado"
          :disabled="deshabilitado"
          @click="agregarBloque('encabezado2')"
        >
          <Heading2 aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Agregar cita"
          aria-label="Agregar cita"
          :disabled="deshabilitado"
          @click="agregarBloque('cita')"
        >
          <Quote aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Agregar lista"
          aria-label="Agregar lista"
          :disabled="deshabilitado"
          @click="agregarBloque('lista')"
        >
          <List aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Agregar lista numerada"
          aria-label="Agregar lista numerada"
          :disabled="deshabilitado"
          @click="agregarBloque('listaNumerada')"
        >
          <ListOrdered aria-hidden="true" />
        </button>
        <button
          type="button"
          title="Agregar noticia relacionada"
          aria-label="Agregar noticia relacionada"
          :disabled="deshabilitado"
          @click="agregarBloque('articuloRelacionado')"
        >
          <Link2 aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="lista-bloques-editor">
      <article
        v-for="(bloque, indice) in modelValue"
        :key="bloque.id"
        class="bloque-editorial"
      >
        <div class="barra-bloque-editorial">
          <GripVertical aria-hidden="true" />
          <label :for="`tipo-${bloque.id}`" class="sr-only">
            Tipo de bloque {{ indice + 1 }}
          </label>
          <select
            :id="`tipo-${bloque.id}`"
            :value="bloque.tipo"
            :disabled="deshabilitado"
            @change="cambiarTipoBloque(
              bloque.id,
              ($event.target as HTMLSelectElement).value as TipoBloqueEditorEditorial
            )"
          >
            <option
              v-for="opcion in tiposBloque"
              :key="opcion.tipo"
              :value="opcion.tipo"
            >
              {{ opcion.etiqueta }}
            </option>
          </select>

          <div class="acciones-bloque-editorial">
            <button
              type="button"
              title="Subir bloque"
              :aria-label="`Subir bloque ${indice + 1}`"
              :disabled="deshabilitado || indice === 0"
              @click="moverBloque(indice, -1)"
            >
              <ChevronUp aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Bajar bloque"
              :aria-label="`Bajar bloque ${indice + 1}`"
              :disabled="deshabilitado || indice === modelValue.length - 1"
              @click="moverBloque(indice, 1)"
            >
              <ChevronDown aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Eliminar bloque"
              :aria-label="`Eliminar bloque ${indice + 1}`"
              :disabled="deshabilitado"
              @click="eliminarBloque(bloque.id)"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>

        <SelectorArticuloRelacionado
          v-if="bloque.tipo === 'articuloRelacionado'"
          :model-value="bloque.articuloRelacionado"
          :articulo-id-actual="articuloIdActual"
          :deshabilitado="deshabilitado"
          @update:model-value="actualizarBloque(
            bloque.id,
            { articuloRelacionado: $event }
          )"
        />

        <label v-else :for="`contenido-${bloque.id}`" class="sr-only">
          Contenido del bloque {{ indice + 1 }}
        </label>
        <textarea
          v-if="bloque.tipo !== 'articuloRelacionado'"
          :id="`contenido-${bloque.id}`"
          :value="bloque.texto"
          :rows="filasBloque(bloque.tipo)"
          maxlength="5000"
          :placeholder="bloque.tipo === 'lista' || bloque.tipo === 'listaNumerada'
            ? 'Escribe un elemento por línea'
            : 'Escribe aquí...'"
          :disabled="deshabilitado"
          @input="actualizarBloque(
            bloque.id,
            { texto: ($event.target as HTMLTextAreaElement).value }
          )"
        />
      </article>
    </div>

    <button
      class="boton-agregar-bloque"
      type="button"
      :disabled="deshabilitado"
      @click="agregarBloque('parrafo')"
    >
      <Plus aria-hidden="true" />
      <span>Agregar bloque</span>
    </button>
  </section>
</template>
