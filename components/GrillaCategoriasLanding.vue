<script setup lang="ts">
import type { CategoriaLanding } from '~/types/landing'

defineProps<{
  categorias: CategoriaLanding[]
}>()
</script>

<template>
  <div class="grilla-categorias-landing">
    <TarjetaCategoriaLanding
      v-for="categoria in categorias"
      :key="categoria.etiqueta"
      :categoria="categoria"
    />
  </div>
</template>
