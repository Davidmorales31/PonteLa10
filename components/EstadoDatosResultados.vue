<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'

withDefaults(defineProps<{ titulo?: string; descripcion?: string; permitirReintento?: boolean }>(), {
  titulo: 'No hay datos disponibles',
  descripcion: 'El proveedor no tiene información disponible para esta consulta.',
  permitirReintento: false
})
defineEmits<{ reintentar: [] }>()
</script>

<template>
  <div class="estado-datos-resultados" role="status">
    <img src="/editorial/estado_sin_datos_resultados.png" alt="Marcador deportivo temporalmente sin datos">
    <strong>{{ titulo }}</strong>
    <p>{{ descripcion }}</p>
    <button v-if="permitirReintento" type="button" @click="$emit('reintentar')"><RefreshCw aria-hidden="true" /> Reintentar</button>
  </div>
</template>
