<script setup lang="ts">
import { ArrowLeftRight, Goal, Square } from '@lucide/vue'
import type { EventoPartido } from '~/types/resultados'

defineProps<{ tipo: EventoPartido['tipo'] }>()
</script>

<template>
  <span class="icono-evento-partido" :class="`icono-evento-${tipo}`" aria-hidden="true">
    <Goal v-if="tipo === 'gol'" />
    <ArrowLeftRight v-else-if="tipo === 'cambio'" />
    <Square v-else />
  </span>
</template>
