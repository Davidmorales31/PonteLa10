<script setup lang="ts">
import {
  articuloDestacadoLanding,
  articulosRecientesLanding,
  articulosTechLanding,
  categoriasLanding,
  cuentaCtaLanding,
  especialesLanding,
  heroLanding
} from '~/data/landing.mock'
import type { RespuestaResultados } from '~/types/resultados'

const { data: resultados, status: estadoResultados } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'resultados-portada',
  lazy: true
})

useSeoPont3la10({
  titulo: 'Pont3la10 | Noticias de deporte y tecnología',
  descripcion: 'Noticias, análisis, resultados y especiales interactivos de fútbol, tecnología deportiva y gaming con la jugada clara.',
  rutaCanonica: '/',
  imagen: heroLanding.imagen,
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
    <SeccionHero :datos="heroLanding" />

    <div class="contenedor-landing contenido-home-landing">
      <section class="seccion-landing seccion-jugada-dia" aria-labelledby="titulo-jugada-dia">
        <EncabezadoSeccion id-titulo="titulo-jugada-dia" titulo="La jugada del día" :acento="true" />
        <TarjetaArticuloDestacado :articulo="articuloDestacadoLanding" />
      </section>

      <section class="seccion-landing" aria-labelledby="titulo-ultimas-jugadas">
        <EncabezadoSeccion
          id-titulo="titulo-ultimas-jugadas"
          titulo="Últimas jugadas"
          :accion="{ etiqueta: 'Ver todas', ruta: '/articulos' }"
        />
        <div class="grilla-articulos-landing">
          <TarjetaArticuloLanding
            v-for="articulo in articulosRecientesLanding"
            :key="articulo.slug"
            :articulo="articulo"
          />
        </div>
      </section>

      <section class="seccion-landing" aria-labelledby="titulo-categorias-landing">
        <EncabezadoSeccion id-titulo="titulo-categorias-landing" titulo="Explora por cancha" />
        <GrillaCategoriasLanding :categorias="categoriasLanding" />
      </section>

      <SeccionEspecialesLanding :especiales="especialesLanding" />

      <section class="seccion-landing" aria-labelledby="titulo-tech-landing">
        <EncabezadoSeccion
          id-titulo="titulo-tech-landing"
          titulo="La tecnología también se puso la 10"
          :accion="{ etiqueta: 'Ver más', ruta: '/articulos?categoria=tecnologia' }"
        />
        <div class="grilla-tech-landing">
          <TarjetaArticuloCompacto
            v-for="articulo in articulosTechLanding"
            :key="articulo.titulo"
            :articulo="articulo"
          />
        </div>
      </section>

      <SeccionCuentaCta :datos="cuentaCtaLanding" />
    </div>
  </div>
</template>
