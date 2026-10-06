<script setup lang="ts">
import PaginaCompeticionPublica from '~/components/publico/PaginaCompeticionPublica.vue'

const ruta = useRoute()
const slug = computed(() => String(ruta.params.slug || ''))
</script>

<template>
  <PaginaCompeticionPublica :key="slug" :slug="slug" />
</template>
