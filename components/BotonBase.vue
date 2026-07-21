<script setup lang="ts">
import { ArrowRight, UserRound } from '@lucide/vue'
import type { AccionLanding } from '~/types/landing'

withDefaults(defineProps<{
  accion: AccionLanding
  variante?: 'primario' | 'secundario' | 'claro'
  icono?: 'flecha' | 'usuario' | 'ninguno'
}>(), {
  variante: 'primario',
  icono: 'flecha'
})
</script>

<template>
  <NuxtLink :to="accion.ruta" :class="['boton-base', `boton-base-${variante}`]">
    <UserRound v-if="icono === 'usuario'" aria-hidden="true" />
    <span>{{ accion.etiqueta }}</span>
    <ArrowRight v-if="icono === 'flecha'" aria-hidden="true" />
  </NuxtLink>
</template>
