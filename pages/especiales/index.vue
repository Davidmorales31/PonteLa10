<script setup lang="ts">
import { modulosInteractivos } from '~/data/editorial'

useSeoPont3la10({
  titulo: 'Especiales interactivos de deporte | Pont3la10',
  descripcion: 'Explora simuladores, juegos y experiencias deportivas interactivas para participar, guardar avances y compartir cada jugada.',
  rutaCanonica: '/especiales',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Especiales interactivos de Pont3la10',
    description: 'Simuladores, juegos y experiencias deportivas interactivas.',
    inLanguage: 'es-CO',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: modulosInteractivos.map((modulo, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: modulo.nombre
      }))
    }
  }
})
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
