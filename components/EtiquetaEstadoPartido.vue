<script setup lang="ts">
import { Radio } from '@lucide/vue'
import type { PartidoResultado } from '~/types/resultados'
import { obtenerEtiquetaEstado } from '~/utils/resultadosDeportivos'

defineProps<{ partido: PartidoResultado }>()
</script>

<template>
  <span class="etiqueta-estado-partido" :class="`estado-${partido.estado}`">
    <Radio v-if="partido.estado === 'en-vivo'" aria-hidden="true" />
    <span>{{ partido.estado === 'en-vivo' ? 'En vivo' : obtenerEtiquetaEstado(partido) }}</span>
    <strong v-if="partido.estado === 'en-vivo'">{{ obtenerEtiquetaEstado(partido) }}</strong>
  </span>
</template>
