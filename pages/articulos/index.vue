<script setup lang="ts">
import { articulosRecientes, tendenciasEditoriales } from '~/data/editorial'
import {
  articulosLanding,
  convertirArticuloLandingAResumen,
  normalizarTextoBusqueda,
  obtenerAliasCategoria,
  obtenerEtiquetaCategoria
} from '~/utils/articulosLanding'

const rutaActual = useRoute()
const articulosHome = articulosLanding.map(convertirArticuloLandingAResumen)
const articulosDisponibles = [...articulosHome, ...articulosRecientes].filter(
  (articulo, indice, articulos) => articulos.findIndex(item => item.slug === articulo.slug) === indice
)

const terminoBusqueda = computed(() => normalizarTextoBusqueda(String(rutaActual.query.buscar || '')))
const categoriaBusqueda = computed(() => normalizarTextoBusqueda(String(rutaActual.query.categoria || '')))
const aliasCategoriaBusqueda = computed(() => obtenerAliasCategoria(categoriaBusqueda.value))

const articulosFiltrados = computed(() => articulosDisponibles.filter((articulo) => {
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
