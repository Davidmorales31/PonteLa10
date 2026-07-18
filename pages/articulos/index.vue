<script setup lang="ts">
import { articulosRecientes, tendenciasEditoriales } from '~/data/editorial'
</script>

<template>
  <section class="pagina-contenido">
    <div class="cabecera-pagina">
      <p class="etiqueta-seccion">Editorial</p>
      <h1>Articulos</h1>
      <p>Notas, analisis y tendencias con tono cercano, contexto claro y criterio editorial.</p>
    </div>

    <div class="layout-listado">
      <div class="lista-articulos">
        <TarjetaArticulo v-for="articulo in articulosRecientes" :key="articulo.slug" :articulo="articulo" />
      </div>
      <BloqueTendencias :tendencias="tendenciasEditoriales" />
    </div>
  </section>
</template>
