<script setup lang="ts">
import { articulosRecientes } from '~/data/editorial'

const ruta = useRoute()
const articulo = computed(() => articulosRecientes.find((item) => item.slug === ruta.params.slug) || articulosRecientes[0])

useHead(() => ({
  title: `${articulo.value.titulo} - Pont3la10`,
  meta: [{ name: 'description', content: articulo.value.bajada }]
}))
</script>

<template>
  <article class="detalle-articulo">
    <NuxtLink class="enlace-fuerte" to="/articulos">Volver a articulos</NuxtLink>
    <p class="etiqueta-seccion">{{ articulo.categoria }}</p>
    <h1>{{ articulo.titulo }}</h1>
    <p class="resumen-articulo">{{ articulo.bajada }}</p>
    <p class="meta-articulo">{{ articulo.autor }} · {{ articulo.publicadoHace }} · {{ articulo.lecturaMinutos }} min</p>
    <img class="imagen-detalle" :src="articulo.imagen" :alt="articulo.titulo">
    <div class="cuerpo-articulo">
      <p>
        Este es contenido semilla para validar la estructura editorial. La version conectada a base de datos reemplazara
        estos datos por articulos aprobados desde el panel.
      </p>
      <p>
        La regla desde el inicio: publicar con claridad, evitar titulares enganadores y mantener una voz deportiva
        colombiana sin perder alcance.
      </p>
    </div>
  </article>
</template>
