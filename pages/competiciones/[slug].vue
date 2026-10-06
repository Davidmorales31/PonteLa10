<script setup lang="ts">
import PaginaCompeticionPublica from '~/components/publico/PaginaCompeticionPublica.vue'

const ruta = useRoute()
const slug = computed(() => String(ruta.params.slug || ''))
const temporada = computed(() => String(ruta.params.temporada || ''))
</script>

<template>
  <NuxtPage v-if="temporada" />
  <PaginaCompeticionPublica v-else :key="slug" :slug="slug" />
</template>
