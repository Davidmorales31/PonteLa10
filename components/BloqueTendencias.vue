<script setup lang="ts">
import type { TendenciaEditorial } from '~/types/editorial'

defineProps<{
  tendencias: TendenciaEditorial[]
}>()
</script>

<template>
  <aside class="bloque-tendencias" aria-labelledby="titulo-tendencias">
    <div class="encabezado-lateral">
      <p class="etiqueta-seccion">En caliente</p>
      <h2 id="titulo-tendencias">Tendencias</h2>
    </div>
    <ol>
      <li v-for="tendencia in tendencias" :key="tendencia.posicion">
        <span>{{ tendencia.posicion }}</span>
        <div>
          <p>{{ tendencia.categoria }}</p>
          <h3>{{ tendencia.titulo }}</h3>
        </div>
      </li>
    </ol>
  </aside>
</template>
