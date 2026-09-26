<script setup lang="ts">
import BarraCompartirArticulo from '~/components/editorial/BarraCompartirArticulo.vue'
import ContenidoArticuloPublico from '~/components/editorial/ContenidoArticuloPublico.vue'
import SeccionArticulosRelacionados from '~/components/editorial/SeccionArticulosRelacionados.vue'
import type {
  ArticuloPublicoEditorial,
  ResumenArticuloPublico
} from '~/types/contenidoEditorial'
import {
  construirTituloMetaConMarca,
  robotsIndexables,
  robotsNoIndex
} from '~/utils/seo'
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

if (!articuloPublicado.value) {
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
  : 'Artículo no encontrado'
)
const tituloMeta = computed(() => construirTituloMetaConMarca(tituloSeo.value))
const descripcionSeo = computed(() => articuloPublicado.value
  ? articuloPublicado.value.seoDescripcion || articuloPublicado.value.resumen
  : 'La publicación solicitada no está disponible.'
)
const imagenSeo = computed(() => articuloPublicado.value?.portada?.url
  || undefined
)
const imagenAltSeo = computed(() => articuloPublicado.value?.portada?.textoAlternativo
  || articuloPublicado.value?.titulo
  || 'Pont3la10'
)
const autorEstructurado = computed(() => {
  const nombre = articuloPublicado.value?.autorNombre || 'Equipo Pont3la10'
  return {
    '@type': nombre === 'Equipo Pont3la10' ? 'Organization' : 'Person',
    name: nombre
  }
})

useSeoPont3la10(() => ({
  titulo: tituloMeta.value,
  descripcion: descripcionSeo.value,
  rutaCanonica: `/articulos/${slugActual.value}`,
  imagen: imagenSeo.value,
  imagenAlt: imagenAltSeo.value,
  imagenAncho: articuloPublicado.value?.portada?.ancho,
  imagenAlto: articuloPublicado.value?.portada?.alto,
  tipoOpenGraph: 'article',
  fechaPublicacion: articuloPublicado.value?.publicadoEn,
  seccion: articuloPublicado.value?.categoria?.nombre,
  robots: articuloPublicado.value ? robotsIndexables : robotsNoIndex,
  datosEstructurados: articuloPublicado.value
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          '@id': `${urlCanonica.value}#articulo`,
          url: urlCanonica.value,
          headline: articuloPublicado.value.titulo,
          description: descripcionSeo.value,
          image: articuloPublicado.value.portada
            ? {
                '@type': 'ImageObject',
                url: articuloPublicado.value.portada.url,
                width: articuloPublicado.value.portada.ancho || undefined,
                height: articuloPublicado.value.portada.alto || undefined,
                caption: articuloPublicado.value.portada.pieDeFoto || undefined
              }
            : undefined,
          thumbnailUrl: articuloPublicado.value.portada?.url,
          datePublished: articuloPublicado.value.publicadoEn,
          dateModified: articuloPublicado.value.publicadoEn,
          articleSection: articuloPublicado.value.categoria?.nombre,
          inLanguage: 'es-CO',
          isAccessibleForFree: true,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': urlCanonica.value
          },
          author: autorEstructurado.value,
          publisher: {
            '@type': 'Organization',
            '@id': `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/#organizacion`,
            name: 'Pont3la10',
            logo: {
              '@type': 'ImageObject',
              url: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/brand/pont3la10_logo_06_horizontal_sobre_blanco.png`
            }
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Inicio',
              item: String(configuracion.public.siteUrl).replace(/\/+$/, '')
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Noticias',
              item: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/articulos`
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: articuloPublicado.value.titulo,
              item: urlCanonica.value
            }
          ]
        }
      ]
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
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: articuloPublicado.categoria?.nombre || 'Noticias', ruta: '/articulos' }, { etiqueta: articuloPublicado.titulo }]" />
    <header class="cabecera-articulo-publicado">
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
        v-if="articuloPublicado.portada.pieDeFoto || articuloPublicado.portada.credito || articuloPublicado.portada.fuenteFotoUrl"
      >
        <span>{{ articuloPublicado.portada.pieDeFoto }}</span>
        <small v-if="articuloPublicado.portada.credito">
          {{ articuloPublicado.portada.credito }}
        </small>
        <a
          v-if="articuloPublicado.portada.fuenteFotoUrl"
          :href="articuloPublicado.portada.fuenteFotoUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          Ver foto y licencia
        </a>
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
</template>
