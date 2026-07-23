<script setup lang="ts">
import { footerLanding } from '~/data/landing.mock'

const anioActual = new Date().getFullYear()
const redesSociales = [
  { nombre: 'Instagram', red: 'instagram' as const, url: 'https://www.instagram.com/' },
  { nombre: 'TikTok', red: 'tiktok' as const, url: 'https://www.tiktok.com/' },
  { nombre: 'X', red: 'x' as const, url: 'https://x.com/' },
  { nombre: 'YouTube', red: 'youtube' as const, url: 'https://www.youtube.com/' }
]
</script>

<template>
  <footer id="pie-pagina" class="pie-pagina-landing">
    <div class="pie-pagina-contenido">
      <section class="marca-pie-pagina" aria-label="Pont3la10">
        <img src="/brand/pont3la10_logo_login_blanco.png" alt="Pont3la10">
        <p>{{ footerLanding.descripcion }}</p>
        <div class="redes-pie-pagina" aria-label="Redes sociales">
          <a
            v-for="red in redesSociales"
            :key="red.nombre"
            :href="red.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`Pont3la10 en ${red.nombre}`"
            :title="red.nombre"
          ><IconoRedSocial :red="red.red" /></a>
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
