<script setup lang="ts">
import BarraCompartirArticulo from '~/components/editorial/BarraCompartirArticulo.vue'
import ContenidoArticuloPublico from '~/components/editorial/ContenidoArticuloPublico.vue'
import SeccionArticulosRelacionados from '~/components/editorial/SeccionArticulosRelacionados.vue'
import { articulosRecientes } from '~/data/editorial'
import type {
  ArticuloPublicoEditorial,
  ResumenArticuloPublico
} from '~/types/contenidoEditorial'
import {
  convertirArticuloLandingAResumen,
  obtenerArticuloLandingPorSlug
} from '~/utils/articulosLanding'
import { robotsIndexables, robotsNoIndex } from '~/utils/seo'
import { seleccionarArticulosRelacionados } from '~/utils/editorial/distribucion'

const ruta = useRoute()
const slugActual = computed(() => String(ruta.params.slug || ''))
const { data: articuloPublicado } = await useFetch<ArticuloPublicoEditorial>(
  () => `/api/articulos/${slugActual.value}`,
  {
    key: `articulo-publico-${slugActual.value}`,
    ignoreResponseError: true
  }
)

const articuloLanding = computed(() =>
  obtenerArticuloLandingPorSlug(slugActual.value)
)
const articuloMock = computed(() => articuloLanding.value
  ? convertirArticuloLandingAResumen(articuloLanding.value)
  : articulosRecientes.find(item => item.slug === slugActual.value)
)

const { data: publicacionesDisponibles } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos',
  {
    key: 'articulos-relacionados-publicos',
    query: { limite: 20 },
    default: () => []
  }
)

const articulosRelacionados = computed(() => {
  if (!articuloPublicado.value) return []

  return seleccionarArticulosRelacionados(
    publicacionesDisponibles.value,
    articuloPublicado.value.id,
    articuloPublicado.value.categoria?.nombre || 'Actualidad'
  )
})

if (!articuloPublicado.value && !articuloMock.value) {
  if (import.meta.server) {
    const eventoSolicitud = useRequestEvent()
    eventoSolicitud?.node?.res?.setHeader('X-Robots-Tag', 'noindex, follow')
  }

  throw createError({ statusCode: 404, statusMessage: 'Artículo no encontrado' })
}

const configuracion = useRuntimeConfig()
const urlCanonica = computed(() =>
  `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/articulos/${slugActual.value}`
)
const tituloSeo = computed(() => articuloPublicado.value
  ? articuloPublicado.value.seoTitulo || articuloPublicado.value.titulo
  : articuloMock.value!.titulo
)
const descripcionSeo = computed(() => articuloPublicado.value
  ? articuloPublicado.value.seoDescripcion || articuloPublicado.value.resumen
  : articuloMock.value!.bajada
)
const imagenSeo = computed(() => articuloPublicado.value?.portada?.url
  || articuloMock.value?.imagen
)

useSeoPont3la10(() => ({
  titulo: `${tituloSeo.value} | Pont3la10`,
  descripcion: descripcionSeo.value,
  rutaCanonica: `/articulos/${slugActual.value}`,
  imagen: imagenSeo.value,
  tipoOpenGraph: 'article',
  robots: articuloPublicado.value ? robotsIndexables : robotsNoIndex,
  datosEstructurados: articuloPublicado.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: articuloPublicado.value.titulo,
        description: articuloPublicado.value.resumen,
        image: articuloPublicado.value.portada?.url,
        datePublished: articuloPublicado.value.publicadoEn,
        dateModified: articuloPublicado.value.publicadoEn,
        mainEntityOfPage: urlCanonica.value,
        author: {
          '@type': 'Person',
          name: articuloPublicado.value.autorNombre
        },
        publisher: {
          '@type': 'Organization',
          name: 'Pont3la10',
          logo: {
            '@type': 'ImageObject',
            url: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/brand/pont3la10_logo_05_app_icon_favicon.png`
          }
        }
      }
    : undefined
}))

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}
</script>

<template>
  <article v-if="articuloPublicado" class="detalle-articulo detalle-articulo-publicado">
    <header class="cabecera-articulo-publicado">
      <NuxtLink class="enlace-fuerte" to="/articulos">Volver a artículos</NuxtLink>
      <p class="etiqueta-seccion">
        {{ articuloPublicado.categoria?.nombre || 'Actualidad' }}
      </p>
      <h1>{{ articuloPublicado.titulo }}</h1>
      <p class="resumen-articulo">{{ articuloPublicado.resumen }}</p>
      <p class="meta-articulo">
        {{ articuloPublicado.autorNombre }} ·
        <time :datetime="articuloPublicado.publicadoEn">
          {{ formatearFecha(articuloPublicado.publicadoEn) }}
        </time>
      </p>
    </header>

    <BarraCompartirArticulo
      :titulo="articuloPublicado.titulo"
      :texto="articuloPublicado.textoSocial || articuloPublicado.resumen"
      :url="urlCanonica"
    />

    <figure v-if="articuloPublicado.portada" class="portada-articulo-publicado">
      <img
        class="imagen-detalle"
        :src="articuloPublicado.portada.url"
        :alt="articuloPublicado.portada.textoAlternativo"
        :width="articuloPublicado.portada.ancho || 1600"
        :height="articuloPublicado.portada.alto || 900"
      >
      <figcaption
        v-if="articuloPublicado.portada.pieDeFoto || articuloPublicado.portada.credito"
      >
        <span>{{ articuloPublicado.portada.pieDeFoto }}</span>
        <small v-if="articuloPublicado.portada.credito">
          {{ articuloPublicado.portada.credito }}
        </small>
      </figcaption>
    </figure>

    <ContenidoArticuloPublico :documento="articuloPublicado.documento" />

    <footer
      v-if="articuloPublicado.fuente.url || articuloPublicado.fuente.creditos"
      class="fuentes-articulo-publicado"
    >
      <strong>Fuentes y créditos</strong>
      <a
        v-if="articuloPublicado.fuente.url"
        :href="articuloPublicado.fuente.url"
        target="_blank"
        rel="noreferrer noopener"
      >
        {{ articuloPublicado.fuente.nombre || 'Fuente original' }}
      </a>
      <p v-if="articuloPublicado.fuente.creditos">
        {{ articuloPublicado.fuente.creditos }}
      </p>
    </footer>

    <BarraCompartirArticulo
      variante="inferior"
      :titulo="articuloPublicado.titulo"
      :texto="articuloPublicado.textoSocial || articuloPublicado.resumen"
      :url="urlCanonica"
    />

    <SeccionArticulosRelacionados :articulos="articulosRelacionados" />
  </article>

  <article v-else-if="articuloMock" class="detalle-articulo">
    <NuxtLink class="enlace-fuerte" to="/articulos">Volver a artículos</NuxtLink>
    <p class="etiqueta-seccion">{{ articuloMock.categoria }}</p>
    <h1>{{ articuloMock.titulo }}</h1>
    <p class="resumen-articulo">{{ articuloMock.bajada }}</p>
    <p class="meta-articulo">
      {{ articuloMock.autor }} · {{ articuloMock.publicadoHace }} ·
      {{ articuloMock.lecturaMinutos }} min
    </p>
    <img class="imagen-detalle" :src="articuloMock.imagen" :alt="articuloMock.titulo">
    <div class="cuerpo-articulo">
      <p>
        Esta es una noticia de demostración para validar la experiencia editorial
        de Pont3la10.
      </p>
      <p>
        La regla desde el inicio: contexto claro, fuentes identificables y una
        voz deportiva colombiana que informe sin titulares engañosos.
      </p>
    </div>
  </article>
</template>
