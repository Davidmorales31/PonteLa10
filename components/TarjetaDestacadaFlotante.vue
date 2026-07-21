<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { TarjetaFlotanteLanding } from '~/types/landing'
import { obtenerIconoLanding } from '~/utils/iconosLanding'

defineProps<{
  tarjeta: TarjetaFlotanteLanding
}>()
</script>

<template>
  <NuxtLink :to="tarjeta.ruta" class="tarjeta-flotante-hero">
    <component :is="obtenerIconoLanding(tarjeta.icono)" aria-hidden="true" />
    <span>
      <small :class="`tono-${tarjeta.tono}`">{{ tarjeta.categoria }}</small>
      <strong>{{ tarjeta.titulo }}</strong>
      <em>{{ tarjeta.detalle }}</em>
    </span>
    <ArrowRight aria-hidden="true" />
  </NuxtLink>
</template>
