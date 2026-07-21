<script setup lang="ts">
import { Camera, MessageCircle, Play } from '@lucide/vue'
import { footerLanding } from '~/data/landing.mock'

const anioActual = new Date().getFullYear()
</script>

<template>
  <footer id="pie-pagina" class="pie-pagina-landing">
    <div class="pie-pagina-contenido">
      <section class="marca-pie-pagina" aria-label="Pont3la10">
        <img src="/brand/pont3la10_logo_login_blanco.png" alt="Pont3la10">
        <p>{{ footerLanding.descripcion }}</p>
        <div class="redes-pie-pagina" aria-label="Redes sociales">
          <a href="#pie-pagina" aria-label="Pont3la10 en Instagram" title="Instagram"><Camera aria-hidden="true" /></a>
          <a href="#pie-pagina" aria-label="Pont3la10 en Facebook" title="Facebook"><MessageCircle aria-hidden="true" /></a>
          <a href="#pie-pagina" aria-label="Pont3la10 en YouTube" title="YouTube"><Play aria-hidden="true" /></a>
        </div>
        <small>© {{ anioActual }} Pont3la10. Todos los derechos reservados.</small>
      </section>

      <nav
        v-for="columna in footerLanding.columnas"
        :key="columna.titulo"
        class="columna-pie-pagina"
        :aria-label="columna.titulo"
      >
        <strong>{{ columna.titulo }}</strong>
        <NuxtLink v-for="enlace in columna.enlaces" :key="enlace.etiqueta" :to="enlace.ruta">
          {{ enlace.etiqueta }}
        </NuxtLink>
      </nav>

      <section class="newsletter-pie-pagina">
        <strong>Newsletter</strong>
        <p>{{ footerLanding.textoNewsletter }}</p>
        <FormularioNewsletter />
      </section>
    </div>
  </footer>
</template>
