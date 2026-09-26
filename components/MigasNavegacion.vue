<script setup lang="ts">
import { ChevronRight, House } from '@lucide/vue'

defineProps<{
  elementos: Array<{ etiqueta: string, ruta?: string }>
}>()
</script>

<template>
  <nav class="migas-navegacion" aria-label="Migas de pan">
    <ol>
      <li v-for="(elemento, indice) in elementos" :key="`${elemento.etiqueta}-${indice}`">
        <NuxtLink v-if="elemento.ruta && indice < elementos.length - 1" :to="elemento.ruta">
          <House v-if="indice === 0" aria-hidden="true" />
          <span>{{ elemento.etiqueta }}</span>
        </NuxtLink>
        <span v-else aria-current="page" class="miga-actual" :title="elemento.etiqueta">
          {{ elemento.etiqueta }}
        </span>
        <ChevronRight v-if="indice < elementos.length - 1" aria-hidden="true" class="separador-miga" />
      </li>
    </ol>
  </nav>
</template>
