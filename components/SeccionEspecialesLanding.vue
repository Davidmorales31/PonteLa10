<script setup lang="ts">
import type { EspecialLanding } from '~/types/landing'

defineProps<{
  especiales: EspecialLanding[]
}>()
</script>

<template>
  <section class="seccion-landing" aria-labelledby="titulo-especiales-landing">
    <EncabezadoSeccion
      id-titulo="titulo-especiales-landing"
      titulo="Especiales para jugar la noticia"
      :accion="{ etiqueta: 'Ver todos', ruta: '/especiales' }"
    />
    <div class="grilla-especiales-landing">
      <TarjetaEspecialLanding
        v-for="especial in especiales"
        :key="especial.titulo"
        :especial="especial"
      />
    </div>
  </section>
</template>
