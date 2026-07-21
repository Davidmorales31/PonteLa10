<script setup lang="ts">
import { articulosRecientes } from '~/data/editorial'
import {
  convertirArticuloLandingAResumen,
  obtenerArticuloLandingPorSlug
} from '~/utils/articulosLanding'

const ruta = useRoute()
const slugActual = computed(() => String(ruta.params.slug))
const articuloLanding = computed(() => obtenerArticuloLandingPorSlug(slugActual.value))
const articulo = computed(() => {
  if (articuloLanding.value) {
    return convertirArticuloLandingAResumen(articuloLanding.value)
  }

  return articulosRecientes.find(item => item.slug === slugActual.value) || articulosRecientes[0]
})

useHead(() => ({
  title: `${articulo.value.titulo} | Pont3la10`,
  meta: [
    { name: 'description', content: articulo.value.bajada },
    { property: 'og:title', content: articulo.value.titulo },
    { property: 'og:description', content: articulo.value.bajada },
    { property: 'og:image', content: articulo.value.imagen },
    { name: 'twitter:card', content: 'summary_large_image' }
  ]
}))
</script>

<template>
  <article class="detalle-articulo">
    <NuxtLink class="enlace-fuerte" to="/articulos">Volver a artículos</NuxtLink>
    <p class="etiqueta-seccion">{{ articulo.categoria }}</p>
    <h1>{{ articulo.titulo }}</h1>
    <p class="resumen-articulo">{{ articulo.bajada }}</p>
    <p class="meta-articulo">{{ articulo.autor }} · {{ articulo.publicadoHace }} · {{ articulo.lecturaMinutos }} min</p>
    <img class="imagen-detalle" :src="articulo.imagen" :alt="articulo.titulo">
    <div class="cuerpo-articulo">
      <p>
        Esta es una noticia mock para validar la experiencia editorial de Pont3la10. La conexión con Supabase
        reemplazará este contenido por la versión aprobada desde el panel.
      </p>
      <p>
        La regla desde el inicio: contexto claro, fuentes identificables y una voz deportiva colombiana que informe
        sin titulares engañosos.
      </p>
      <p v-if="articuloLanding?.fuenteUrl" class="fuente-articulo">
        Contexto consultado en
        <a :href="articuloLanding.fuenteUrl" target="_blank" rel="noreferrer noopener">
          {{ articuloLanding.fuenteNombre || 'fuente oficial' }}
        </a>.
      </p>
    </div>
  </article>
</template>
