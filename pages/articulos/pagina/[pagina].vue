<script setup lang="ts">
import PaginaListadoArticulos from '~/pages/articulos/index.vue'
import { leerPaginaArticulosPublica } from '~/utils/paginacionArticulos'

definePageMeta({
  validate: ruta => leerPaginaArticulosPublica(ruta.params.pagina) !== null
})

const rutaActual = useRoute()
if (leerPaginaArticulosPublica(rutaActual.params.pagina) === 1) {
  await navigateTo('/articulos', { redirectCode: 301 })
}
</script>

<template>
  <PaginaListadoArticulos />
</template>
