<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue'
import type { EventoPartido } from '~/types/resultados'

defineProps<{ tipo: EventoPartido['tipo'] }>()
</script>

<template>
  <span class="icono-evento-partido" :class="`icono-evento-${tipo}`" aria-hidden="true">
    <svg v-if="tipo === 'gol'" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Zm-7.6 3.2 4.6-1m6 0 4.6 1M8.2 18l1.9-5.3m3.8 0 1.9 5.3M7.5 19.2h9" />
    </svg>
    <ArrowLeftRight v-else-if="tipo === 'cambio'" />
    <svg v-else viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="1.5" /></svg>
  </span>
</template>
