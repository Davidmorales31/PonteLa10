<script setup lang="ts">
import {
  ArrowRight,
  Clock3,
  FileText,
  Home,
  Mail,
  MapPin,
  Star,
  Trophy
} from '@lucide/vue'
import { articulosTechLanding, footerLanding } from '~/data/landing.mock'

definePageMeta({ layout: false })

if (import.meta.server) {
  const eventoSolicitud = useRequestEvent()
  if (eventoSolicitud) {
    setResponseStatus(eventoSolicitud, 404, 'Pagina no encontrada')
    eventoSolicitud.node?.res?.setHeader('X-Robots-Tag', 'noindex, nofollow')
  }
}

const codigoError = '404'
const recomendacion = articulosTechLanding[0]
const enlacesAyuda = [
  { etiqueta: 'Últimas jugadas', ruta: '/articulos', icono: Clock3 },
  { etiqueta: 'Especiales', ruta: '/especiales', icono: Star },
  { etiqueta: 'Fútbol colombiano', ruta: '/articulos?categoria=futbol-colombiano', icono: Trophy }
]
const enlacesLegales = [
  { etiqueta: 'Términos y condiciones', ruta: '/articulos' },
  { etiqueta: 'Política de privacidad', ruta: '/articulos' },
  { etiqueta: 'Política de cookies', ruta: '/articulos' }
]
const redesSociales = [
  { nombre: 'X', red: 'x' as const, url: 'https://x.com/' },
  { nombre: 'Instagram', red: 'instagram' as const, url: 'https://www.instagram.com/' },
  { nombre: 'YouTube', red: 'youtube' as const, url: 'https://www.youtube.com/' },
  { nombre: 'TikTok', red: 'tiktok' as const, url: 'https://www.tiktok.com/' }
]

function navegarDesdeError(ruta: string) {
  return navigateTo(ruta)
}
</script>

<template>
  <div class="sitio-error">
    <CabeceraPrincipal />

    <main class="pagina-error" aria-labelledby="titulo-error">
      <div class="patron-error patron-error-izquierdo" aria-hidden="true" />
      <div class="patron-error patron-error-derecho" aria-hidden="true" />

      <div class="contenedor-error">
        <section class="contenido-error">
          <div class="codigo-error" :aria-label="`Error ${codigoError}`">
            <strong>{{ codigoError.charAt(0) }}</strong>
            <strong>{{ codigoError.charAt(1) }}</strong>
            <strong>{{ codigoError.charAt(2) }}</strong>
          </div>

          <div class="ruta-error-decorativa" aria-hidden="true"><span /><ArrowRight /></div>

          <h1 id="titulo-error">
            Ups, esta jugada se salió de la cancha.
          </h1>
          <p>
            La página que buscas no está disponible, cambió de posición o ya no está en juego.
          </p>

          <div class="acciones-error">
            <button type="button" class="boton-error boton-error-principal" @click="navegarDesdeError('/')">
              <Home aria-hidden="true" />
              Volver al inicio
            </button>
            <button type="button" class="boton-error boton-error-secundario" @click="navegarDesdeError('/articulos')">
              <FileText aria-hidden="true" />
              Explorar noticias
            </button>
          </div>

          <aside class="ayuda-error" aria-label="Rutas recomendadas">
            <span>¿Necesitas ayuda? Explora por aquí</span>
            <div>
              <button
                v-for="enlace in enlacesAyuda"
                :key="enlace.etiqueta"
                type="button"
                @click="navegarDesdeError(enlace.ruta)"
              >
                <component :is="enlace.icono" aria-hidden="true" />
                {{ enlace.etiqueta }}
              </button>
              <a href="mailto:hola@pont3la10.com">
                <Mail aria-hidden="true" />
                Contacto
              </a>
            </div>
          </aside>
        </section>

        <section class="escena-error" aria-label="Jugador buscando el camino de regreso">
          <img
            src="/editorial/pagina_404_jugador_estadio.png"
            alt="Jugador con el número diez frente a un estadio y un balón"
          >
          <div class="velo-escena-error" aria-hidden="true" />
          <svg class="camino-error" viewBox="0 0 600 420" aria-hidden="true">
            <path d="M145 390 C 245 350, 206 301, 309 265 S 410 189, 459 128" />
          </svg>
          <div class="senal-error">
            <div>
              <small>Página</small>
              <strong>perdida</strong>
            </div>
            <MapPin aria-hidden="true" />
          </div>

          <article class="recomendacion-error">
            <span>Quizá te interese</span>
            <div class="recomendacion-error-contenido">
              <button
                type="button"
                class="imagen-recomendacion-error sprite-tech-primero"
                :aria-label="`Leer ${recomendacion.titulo}`"
                @click="navegarDesdeError(recomendacion.ruta)"
              />
              <div>
                <small>Tech deportiva</small>
                <h2>{{ recomendacion.titulo }}</h2>
                <button type="button" class="enlace-recomendacion-error" @click="navegarDesdeError(recomendacion.ruta)">
                  Leer más <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>

    <footer class="pie-error">
      <div class="pie-error-contenido">
        <section class="marca-pie-error" aria-label="Pont3la10">
          <img src="/brand/pont3la10_logo_06_horizontal_sobre_blanco.png" alt="Pont3la10">
          <p>{{ footerLanding.descripcion }}<br>La nueva forma de vivir la pasión.</p>
        </section>

        <nav class="navegacion-pie-error" aria-label="Navegación del sitio">
          <strong>Navegación</strong>
          <div>
            <button
              v-for="enlace in footerLanding.columnas[0]?.enlaces"
              :key="enlace.etiqueta"
              type="button"
              @click="navegarDesdeError(enlace.ruta)"
            >
              {{ enlace.etiqueta }}
            </button>
          </div>
        </nav>

        <nav class="legal-pie-error" aria-label="Información legal">
          <strong>Legal</strong>
          <button
            v-for="enlace in enlacesLegales"
            :key="enlace.etiqueta"
            type="button"
            @click="navegarDesdeError(enlace.ruta)"
          >
            {{ enlace.etiqueta }}
          </button>
        </nav>

        <section class="redes-pie-error">
          <strong>Síguenos</strong>
          <div>
            <a
              v-for="red in redesSociales"
              :key="red.nombre"
              :href="red.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Pont3la10 en ${red.nombre}`"
              :title="red.nombre"
            >
              <IconoRedSocial :red="red.red" />
            </a>
          </div>
        </section>
      </div>
      <small>© {{ new Date().getFullYear() }} Pont3la10. Todos los derechos reservados.</small>
    </footer>
  </div>
</template>

<style src="~/assets/css/error.css"></style>
