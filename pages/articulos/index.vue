<script setup lang="ts">
import { articulosRecientes, tendenciasEditoriales } from '~/data/editorial'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { ArticuloResumen } from '~/types/editorial'
import {
  articulosLanding,
  convertirArticuloLandingAResumen,
  normalizarTextoBusqueda,
  obtenerAliasCategoria,
  obtenerEtiquetaCategoria
} from '~/utils/articulosLanding'
import { construirUrlAbsoluta, robotsNoIndex } from '~/utils/seo'

const rutaActual = useRoute()
const articulosHome = articulosLanding.map(convertirArticuloLandingAResumen)
const { data: publicacionesReales } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos',
  {
    default: () => [],
    ignoreResponseError: true
  }
)

const articulosPublicados = computed<ArticuloResumen[]>(() =>
  (publicacionesReales.value || []).map(articulo => ({
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen,
    categoria: articulo.categoria,
    autor: articulo.autorNombre,
    publicadoHace: new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium'
    }).format(new Date(articulo.publicadoEn)),
    lecturaMinutos: 4,
    imagen: articulo.imagen || '/editorial/login_pont3la10_estadio_sin_logo.png'
  }))
)

const articulosDisponibles = computed(() => [
  ...articulosPublicados.value,
  ...articulosHome,
  ...articulosRecientes
].filter(
  (articulo, indice, articulos) =>
    articulos.findIndex(item => item.slug === articulo.slug) === indice
))

const terminoBusqueda = computed(() => normalizarTextoBusqueda(String(rutaActual.query.buscar || '')))
const categoriaBusqueda = computed(() => normalizarTextoBusqueda(String(rutaActual.query.categoria || '')))
const aliasCategoriaBusqueda = computed(() => obtenerAliasCategoria(categoriaBusqueda.value))

const articulosFiltrados = computed(() => articulosDisponibles.value.filter((articulo) => {
  const contenido = normalizarTextoBusqueda(`${articulo.titulo} ${articulo.bajada} ${articulo.categoria}`)
  const coincideTermino = !terminoBusqueda.value || contenido.includes(terminoBusqueda.value)
  const coincideCategoria = !categoriaBusqueda.value || aliasCategoriaBusqueda.value.some(alias => contenido.includes(alias))
  return coincideTermino && coincideCategoria
}))

const tituloListado = computed(() => {
  if (rutaActual.query.buscar) {
    return `Resultados para “${String(rutaActual.query.buscar)}”`
  }

  if (rutaActual.query.categoria) {
    return `Noticias de ${obtenerEtiquetaCategoria(String(rutaActual.query.categoria))}`
  }

  return 'Artículos'
})
const configuracion = useRuntimeConfig()
const esBusquedaInterna = computed(() => Boolean(rutaActual.query.buscar))
const rutaCanonica = computed(() => rutaActual.query.categoria && !esBusquedaInterna.value
  ? `/articulos?categoria=${encodeURIComponent(String(rutaActual.query.categoria))}`
  : '/articulos')

useSeoPont3la10(() => {
  const titulo = rutaActual.query.categoria && !esBusquedaInterna.value
    ? `${tituloListado.value} | Pont3la10`
    : 'Noticias y análisis deportivo | Pont3la10'
  const descripcion = rutaActual.query.categoria && !esBusquedaInterna.value
    ? `Noticias, análisis y actualidad de ${obtenerEtiquetaCategoria(String(rutaActual.query.categoria))} en Pont3la10.`
    : 'Noticias y análisis de fútbol, tecnología deportiva, gaming y tendencias con contexto claro y criterio editorial.'

  return {
    titulo,
    descripcion,
    rutaCanonica: rutaCanonica.value,
    robots: esBusquedaInterna.value ? robotsNoIndex : undefined,
    datosEstructurados: esBusquedaInterna.value
      ? undefined
      : {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: tituloListado.value,
          description: descripcion,
          inLanguage: 'es-CO',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: articulosFiltrados.value.map((articulo, indice) => ({
              '@type': 'ListItem',
              position: indice + 1,
              name: articulo.titulo,
              url: construirUrlAbsoluta(
                String(configuracion.public.siteUrl),
                `/articulos/${articulo.slug}`
              )
            }))
          }
        }
  }
})
</script>

<template>
  <section class="pagina-contenido">
    <div class="cabecera-pagina">
      <p class="etiqueta-seccion">Editorial</p>
      <h1>{{ tituloListado }}</h1>
      <p>Noticias, análisis y tendencias con tono cercano, contexto claro y criterio editorial.</p>
    </div>

    <div v-if="articulosFiltrados.length" class="layout-listado">
      <div class="lista-articulos">
        <TarjetaArticulo v-for="articulo in articulosFiltrados" :key="articulo.slug" :articulo="articulo" />
      </div>
      <BloqueTendencias :tendencias="tendenciasEditoriales" />
    </div>
    <div v-else class="estado-vacio-articulos">
      <h2>No encontramos esa jugada</h2>
      <p>Prueba con otra palabra o vuelve a todas las noticias.</p>
      <NuxtLink class="boton-primario" to="/articulos">Ver todas las noticias</NuxtLink>
    </div>
  </section>
</template>
