<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { AccionLanding } from '~/types/landing'

defineProps<{
  titulo: string
  accion?: AccionLanding
  acento?: boolean
  idTitulo?: string
}>()
</script>

<template>
  <header :class="['encabezado-seccion-landing', acento && 'encabezado-seccion-con-acento']">
    <h2 :id="idTitulo">{{ titulo }}</h2>
    <NuxtLink v-if="accion" :to="accion.ruta" class="enlace-seccion-landing">
      {{ accion.etiqueta }}
      <ArrowRight aria-hidden="true" />
    </NuxtLink>
  </header>
</template>
