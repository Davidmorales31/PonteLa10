<script setup lang="ts">
import { pieSitio } from '~/data/sitioPublico'

const anioActual = new Date().getFullYear()
</script>

<template>
  <footer id="pie-pagina" class="pie-pagina-landing">
    <div class="pie-pagina-contenido">
      <section class="marca-pie-pagina" aria-label="Pont3la10">
        <img
          src="/brand/pont3la10_logo_login_blanco.png"
          alt="Pont3la10"
          width="598"
          height="115"
          loading="lazy"
          decoding="async"
        >
        <p>{{ pieSitio.descripcion }}</p>
        <small>
          © {{ anioActual }} Pont3la10. Todos los derechos reservados.
          Producto propiedad de
          <a href="https://labs.pont3la10.com" target="_blank" rel="noopener noreferrer">labs.pont3la10.com</a>.
        </small>
      </section>

      <nav
        v-for="columna in pieSitio.columnas"
        :key="columna.titulo"
        class="columna-pie-pagina"
        :aria-label="columna.titulo"
      >
        <strong>{{ columna.titulo }}</strong>
        <NuxtLink v-for="enlace in columna.enlaces" :key="enlace.etiqueta" :to="enlace.ruta">
          {{ enlace.etiqueta }}
        </NuxtLink>
      </nav>

    </div>
  </footer>
</template>
