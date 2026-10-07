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
    <picture>
      <source srcset="/editorial/estado_sin_datos_resultados-320.webp 320w, /editorial/estado_sin_datos_resultados-640.webp 640w" type="image/webp" sizes="220px">
      <img src="/editorial/estado_sin_datos_resultados.png" alt="Marcador deportivo temporalmente sin datos" width="320" height="320" sizes="220px" loading="lazy" decoding="async">
    </picture>
    <strong>{{ titulo }}</strong>
    <p>{{ descripcion }}</p>
    <button v-if="permitirReintento" type="button" @click="$emit('reintentar')"><RefreshCw aria-hidden="true" /> Reintentar</button>
  </div>
</template>
