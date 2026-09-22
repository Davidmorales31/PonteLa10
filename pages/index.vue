<script setup lang="ts">
import {
  categoriasSitio,
  heroSitio
} from '~/data/sitioPublico'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { ArticuloResumen } from '~/types/editorial'
import type { RespuestaResultados } from '~/types/resultados'

const { data: resultados, status: estadoResultados } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'resultados-portada',
  lazy: true
})

const { data: publicacionesReales } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  key: 'articulos-publicados-portada',
  query: { limite: 6 },
  default: () => [],
  ignoreResponseError: true
})
const articulosPublicados = computed<ArticuloResumen[]>(() =>
  (publicacionesReales.value || []).map(articulo => ({
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen,
    categoria: articulo.categoria,
    autor: articulo.autorNombre,
    publicadoHace: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
      .format(new Date(articulo.publicadoEn)),
    lecturaMinutos: 4,
    imagen: articulo.imagen || '/editorial/login_pont3la10_estadio_sin_logo.png'
  }))
)
const articuloDestacado = computed(() => articulosPublicados.value[0] || null)
const ultimasNoticias = computed(() => articulosPublicados.value.slice(1))

useSeoPont3la10({
  titulo: 'Pont3la10 | Noticias de deporte y tecnología',
  descripcion: 'Noticias, análisis, resultados y especiales interactivos de fútbol, tecnología deportiva y gaming con la jugada clara.',
  rutaCanonica: '/',
  imagen: heroSitio.imagen,
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Pont3la10',
    description: 'Noticias, análisis, resultados y especiales interactivos de deporte y tecnología.',
    inLanguage: 'es-CO'
  }
})
</script>

<template>
  <div class="pagina-inicio">
    <EsqueletoResultados v-if="estadoResultados === 'pending'" tipo="franja" />
    <FranjaMarcadores
      v-else-if="resultados?.partidos.length"
      :partidos="resultados.partidos"
    />
    <SeccionHero :datos="heroSitio" />

    <div class="contenedor-landing contenido-home-landing">
      <section v-if="articuloDestacado" class="seccion-landing seccion-jugada-dia" aria-labelledby="titulo-jugada-dia">
        <EncabezadoSeccion id-titulo="titulo-jugada-dia" titulo="La jugada del día" :acento="true" />
        <TarjetaArticulo :articulo="articuloDestacado" />
      </section>

      <section v-if="ultimasNoticias.length" class="seccion-landing" aria-labelledby="titulo-ultimas-jugadas">
        <EncabezadoSeccion
          id-titulo="titulo-ultimas-jugadas"
          titulo="Últimas jugadas"
          :accion="{ etiqueta: 'Ver todas', ruta: '/articulos' }"
        />
        <div class="grilla-articulos-landing">
          <TarjetaArticuloLanding
            v-for="articulo in ultimasNoticias"
            :key="articulo.slug"
            :articulo="{
              slug: articulo.slug,
              categoria: articulo.categoria,
              titulo: articulo.titulo,
              resumen: articulo.bajada,
              imagen: articulo.imagen,
              descripcionImagen: articulo.titulo,
              publicadoHace: articulo.publicadoHace,
              tiempoLectura: `${articulo.lecturaMinutos} min`,
              ruta: `/articulos/${articulo.slug}`
            }"
          />
        </div>
      </section>

      <section v-if="!articulosPublicados.length" class="seccion-landing estado-vacio-articulos">
        <h2>Aún no hay noticias publicadas</h2>
        <p>Cuando el equipo editorial publique una historia, aparecerá aquí.</p>
      </section>

      <section class="seccion-landing" aria-labelledby="titulo-categorias-landing">
        <EncabezadoSeccion id-titulo="titulo-categorias-landing" titulo="Explora por cancha" />
        <GrillaCategoriasLanding :categorias="categoriasSitio" />
      </section>
    </div>
  </div>
</template>
