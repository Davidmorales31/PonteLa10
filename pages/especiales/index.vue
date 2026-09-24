<script setup lang="ts">
const especiales = [
  {
    titulo: 'Simulador Mundial',
    descripcion: 'Arma tus grupos, cruces y campeón antes de que empiece el torneo.',
    estado: 'En desarrollo'
  },
  {
    titulo: 'Álbum interactivo',
    descripcion: 'Una experiencia editorial para seguir las historias del torneo.',
    estado: 'Próximamente'
  },
  {
    titulo: 'Polla Pont3la10',
    descripcion: 'Pronósticos entre la comunidad cuando la experiencia esté disponible.',
    estado: 'Próximamente'
  }
]

useSeoPont3la10({
  titulo: 'Especiales | Pont3la10',
  descripcion: 'Especiales editoriales de Pont3la10.',
  rutaCanonica: '/especiales',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Especiales de Pont3la10',
    description: 'Especiales editoriales de Pont3la10.',
    inLanguage: 'es-CO'
  }
})
</script>

<template>
  <section class="pagina-contenido pagina-publica-medio pagina-especiales">
    <div class="cabecera-pagina">
      <p class="etiqueta-seccion">Especiales</p>
      <h1>Experiencias especiales</h1>
      <p>Formatos editoriales que iremos habilitando con transparencia sobre su estado.</p>
    </div>
    <div class="especial-destacado">
      <div>
        <p class="etiqueta-seccion">{{ especiales[0].estado }}</p>
        <h2>{{ especiales[0].titulo }}</h2>
        <p>{{ especiales[0].descripcion }}</p>
        <span class="boton-especial-inactivo">Aún no disponible</span>
      </div>
      <span class="ilustracion-especial" aria-hidden="true">P10</span>
    </div>
    <div class="grilla-especiales-publicos">
      <article v-for="especial in especiales.slice(1)" :key="especial.titulo">
        <p>{{ especial.estado }}</p>
        <h2>{{ especial.titulo }}</h2>
        <span>{{ especial.descripcion }}</span>
      </article>
    </div>
  </section>
</template>
