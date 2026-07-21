<script setup lang="ts">
import type { CategoriaLanding } from '~/types/landing'
import { obtenerIconoLanding } from '~/utils/iconosLanding'

defineProps<{
  categoria: CategoriaLanding
}>()
</script>

<template>
  <NuxtLink :to="categoria.ruta" class="tarjeta-categoria-landing">
    <span :class="['icono-categoria-landing', categoria.variante === 'colombia' && 'icono-bandera-colombia']">
      <component :is="obtenerIconoLanding(categoria.icono)" aria-hidden="true" />
    </span>
    <strong>{{ categoria.etiqueta }}</strong>
  </NuxtLink>
</template>
