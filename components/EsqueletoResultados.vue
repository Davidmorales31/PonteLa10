<script setup lang="ts">
withDefaults(defineProps<{ tipo?: 'franja' | 'listado' | 'detalle' }>(), { tipo: 'listado' })
</script>

<template>
  <div class="esqueleto-resultados" :class="`esqueleto-resultados--${tipo}`" aria-hidden="true">
    <template v-if="tipo === 'franja'">
      <div class="esqueleto-bloque esqueleto-titulo-corto" />
      <div v-for="indice in 5" :key="indice" class="esqueleto-tarjeta-marcador"><span /><i /><i /></div>
    </template>
    <template v-else-if="tipo === 'detalle'">
      <div class="esqueleto-cabecera"><span /><strong /><i /></div>
      <div class="esqueleto-marcador-grande"><i /><strong /><i /></div>
      <div class="esqueleto-pestanas"><span v-for="indice in 4" :key="indice" /></div>
      <div class="esqueleto-columnas">
        <div class="esqueleto-panel"><span v-for="indice in 7" :key="indice" /></div>
        <div class="esqueleto-panel"><span v-for="indice in 4" :key="indice" /></div>
      </div>
    </template>
    <template v-else>
      <div class="esqueleto-cabecera"><span /><strong /><i /></div>
      <div class="esqueleto-filtros"><span v-for="indice in 6" :key="indice" /></div>
      <div class="esqueleto-columnas">
        <div class="esqueleto-panel esqueleto-panel-grande"><span v-for="indice in 5" :key="indice" /></div>
        <div class="esqueleto-panel"><span v-for="indice in 5" :key="indice" /></div>
      </div>
    </template>
  </div>
</template>
