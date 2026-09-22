<script setup lang="ts">
import {
  ArrowRight,
  Clock3,
  FileText,
  Home,
  Mail,
  MapPin,
  Trophy
} from '@lucide/vue'

definePageMeta({ layout: false })

useSeoPont3la10({
  titulo: 'Página no encontrada | Pont3la10',
  descripcion: 'La página que buscas no está disponible. Vuelve al inicio o explora las últimas noticias de Pont3la10.',
  robots: 'noindex, follow'
})

if (import.meta.server) {
  const eventoSolicitud = useRequestEvent()
  if (eventoSolicitud) {
    setResponseStatus(eventoSolicitud, 404, 'Pagina no encontrada')
    eventoSolicitud.node?.res?.setHeader('X-Robots-Tag', 'noindex, follow')
  }
}

const codigoError = '404'
const enlacesAyuda = [
  { etiqueta: 'Últimas jugadas', ruta: '/articulos', icono: Clock3 },
  { etiqueta: 'Fútbol colombiano', ruta: '/articulos?categoria=futbol-colombiano', icono: Trophy }
]

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
            <NuxtLink class="boton-error boton-error-principal" to="/">
              <Home aria-hidden="true" />
              Volver al inicio
            </NuxtLink>
            <NuxtLink class="boton-error boton-error-secundario" to="/articulos">
              <FileText aria-hidden="true" />
              Explorar noticias
            </NuxtLink>
          </div>

          <aside class="ayuda-error" aria-label="Rutas recomendadas">
            <span>¿Necesitas ayuda? Explora por aquí</span>
            <div>
              <NuxtLink
                v-for="enlace in enlacesAyuda"
                :key="enlace.etiqueta"
                :to="enlace.ruta"
              >
                <component :is="enlace.icono" aria-hidden="true" />
                {{ enlace.etiqueta }}
              </NuxtLink>
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
            width="1536"
            height="1024"
            decoding="async"
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
            <span>Noticias</span>
            <div class="recomendacion-error-contenido">
              <div>
                <small>Pont3la10</small>
                <h2>Explora las publicaciones disponibles</h2>
                <NuxtLink class="enlace-recomendacion-error" to="/articulos">
                  Ver noticias <ArrowRight aria-hidden="true" />
                </NuxtLink>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>

    <PiePaginaPrincipal />
  </div>
</template>

<style src="~/assets/css/error.css"></style>
