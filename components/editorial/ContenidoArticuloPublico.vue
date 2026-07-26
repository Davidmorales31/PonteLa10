<script setup lang="ts">
import type { DocumentoEditorial } from '~/types/contenidoEditorial'

defineProps<{
  documento: DocumentoEditorial
}>()

function textoNodo(texto?: string): string {
  return texto || ''
}
</script>

<template>
  <div class="cuerpo-articulo cuerpo-articulo-publicado">
    <template v-for="(bloque, indice) in documento.content" :key="indice">
      <p v-if="bloque.type === 'paragraph'">
        {{ textoNodo(bloque.content[0]?.text) }}
      </p>
      <h2 v-else-if="bloque.type === 'heading' && bloque.attrs.level === 2">
        {{ textoNodo(bloque.content[0]?.text) }}
      </h2>
      <h3 v-else-if="bloque.type === 'heading'">
        {{ textoNodo(bloque.content[0]?.text) }}
      </h3>
      <blockquote v-else-if="bloque.type === 'blockquote'">
        {{ textoNodo(bloque.content[0]?.content[0]?.text) }}
      </blockquote>
      <component
        :is="bloque.type === 'orderedList' ? 'ol' : 'ul'"
        v-else-if="bloque.type === 'bulletList' || bloque.type === 'orderedList'"
      >
        <li v-for="(elemento, indiceElemento) in bloque.content" :key="indiceElemento">
          {{ textoNodo(elemento.content[0]?.content[0]?.text) }}
        </li>
      </component>
    </template>
  </div>
</template>
