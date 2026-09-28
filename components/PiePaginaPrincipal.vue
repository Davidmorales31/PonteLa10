<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'
import { pieSitio } from '~/data/sitioPublico'

const anioActual = new Date().getFullYear()
const { disponible: analiticaDisponible, abrirPreferencias } = useAnaliticaPublica()
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

      <section class="patrocinio-pie-pagina" aria-label="Publicidad y alianzas">
        <p>ANÚNCIATE CON NOSOTROS</p>
        <strong>¿Quieres anunciarte en Pont3la10?</strong>
        <a href="mailto:contact@pont3la10.com">contact@pont3la10.com</a>
      </section>

      <button
        v-if="analiticaDisponible"
        class="enlace-preferencias-analitica"
        type="button"
        @click="abrirPreferencias"
      >
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>Preferencias de privacidad</strong>
          <small>Gestiona el consentimiento de analítica</small>
        </span>
      </button>

    </div>
  </footer>
</template>

<style scoped>
.enlace-preferencias-analitica {
  display: inline-flex;
  min-height: 52px;
  grid-column: 1 / -1;
  align-items: center;
  justify-self: start;
  gap: .7rem;
  border: 1px solid #416488;
  border-radius: 12px;
  background: rgba(255, 255, 255, .06);
  color: #f2f7ff;
  padding: .55rem .85rem;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.enlace-preferencias-analitica > svg {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  color: #7ce6f5;
}

.enlace-preferencias-analitica > span {
  display: grid;
  gap: 3px;
}

.enlace-preferencias-analitica strong {
  color: #f2f7ff;
  font-size: .76rem;
  line-height: 1.3;
}

.enlace-preferencias-analitica small {
  color: #c5d4e7;
  font-size: .66rem;
  line-height: 1.35;
}

.enlace-preferencias-analitica:hover {
  transform: translateY(-1px);
  border-color: #71d8ee;
  background: rgba(23, 78, 166, .28);
}

.enlace-preferencias-analitica:focus-visible {
  outline: 3px solid #7ce6f5;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .enlace-preferencias-analitica {
    transition: none;
  }
}
</style>
