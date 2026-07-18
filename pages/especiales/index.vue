<script setup lang="ts">
import { modulosInteractivos } from '~/data/editorial'
</script>

<template>
  <section class="pagina-contenido">
    <div class="cabecera-pagina">
      <p class="etiqueta-seccion">Modulos</p>
      <h1>Especiales interactivos</h1>
      <p>El diferencial de Pont3la10: experiencias que invitan a participar, guardar avance y compartir jugadas.</p>
    </div>

    <div class="grilla-modulos">
      <TarjetaModulo v-for="modulo in modulosInteractivos" :key="modulo.slug" :modulo="modulo" />
    </div>
  </section>
</template>
