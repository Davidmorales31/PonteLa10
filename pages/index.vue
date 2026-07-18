<script setup lang="ts">
import {
  articuloPrincipal,
  articulosRecientes,
  modulosInteractivos,
  tendenciasEditoriales
} from '~/data/editorial'
import { obtenerRutaArticulo } from '~/utils/rutasEditoriales'

const articulosSecundarios = articulosRecientes.slice(1, 3)
const articulosPortada = articulosRecientes.slice(3)
</script>

<template>
  <section class="portada-editorial">
    <div class="bloque-ultima-hora">
      <strong>Ultima hora</strong>
      <span>Mercado, Mundial 2026 y tecnologia deportiva marcan la agenda del dia.</span>
    </div>

    <section class="grilla-portada" aria-labelledby="titulo-portada">
      <article class="historia-principal">
        <NuxtLink :to="obtenerRutaArticulo(articuloPrincipal.slug)" class="imagen-principal">
          <img :src="articuloPrincipal.imagen" :alt="articuloPrincipal.titulo">
        </NuxtLink>
        <div class="contenido-principal">
          <p class="etiqueta-seccion">{{ articuloPrincipal.categoria }}</p>
          <h1 id="titulo-portada">
            <NuxtLink :to="obtenerRutaArticulo(articuloPrincipal.slug)">
              {{ articuloPrincipal.titulo }}
            </NuxtLink>
          </h1>
          <p class="entradilla-principal">{{ articuloPrincipal.bajada }}</p>
          <p class="meta-articulo">
            {{ articuloPrincipal.autor }} · {{ articuloPrincipal.publicadoHace }} · {{ articuloPrincipal.lecturaMinutos }} min
          </p>
        </div>
      </article>

      <div class="columna-secundaria">
        <TarjetaArticulo
          v-for="articulo in articulosSecundarios"
          :key="articulo.slug"
          :articulo="articulo"
          variante="compacta"
        />
      </div>

      <BloqueTendencias :tendencias="tendenciasEditoriales" />
    </section>

    <section class="seccion-editorial" aria-labelledby="titulo-recientes">
      <div class="encabezado-seccion">
        <div>
          <p class="etiqueta-seccion">Radar Pont3la10</p>
          <h2 id="titulo-recientes">Mas historias para seguir la jugada</h2>
        </div>
        <NuxtLink class="enlace-fuerte" to="/articulos">Ver todo</NuxtLink>
      </div>
      <div class="grilla-articulos">
        <TarjetaArticulo v-for="articulo in articulosPortada" :key="articulo.slug" :articulo="articulo" />
      </div>
    </section>

    <section class="franja-especiales" aria-labelledby="titulo-especiales">
      <div class="intro-especiales">
        <p class="etiqueta-seccion">Especiales interactivos</p>
        <h2 id="titulo-especiales">Pont3la10 no solo informa: tambien pone a jugar</h2>
        <p>
          Estos modulos viven como productos internos de la plataforma, conectados al contenido y listos para crecer
          con usuarios, rankings y piezas compartibles.
        </p>
      </div>
      <div class="grilla-modulos">
        <TarjetaModulo v-for="modulo in modulosInteractivos" :key="modulo.slug" :modulo="modulo" />
      </div>
    </section>
  </section>
</template>
