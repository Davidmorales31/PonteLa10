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
import type { HubPublicoEditorial } from '~/types/contenidoEditorial'
import type { EstadoAnaliticaPublica } from '~/utils/analiticaPublica'
import { construirTituloMetaConMarca, robotsIndexables, robotsNoIndex } from '~/utils/seo'

definePageMeta({ layout: false })

const ruta = useRoute()
const segmentosRuta = computed(() => Array.isArray(ruta.params.slug)
  ? ruta.params.slug.map(String)
  : [String(ruta.params.slug || '')])
const slugHub = computed(() => segmentosRuta.value.length === 1
  && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segmentosRuta.value[0] || '')
  ? segmentosRuta.value[0]!
  : '')
const { data: respuestaHub } = await useFetch<HubPublicoEditorial>(
  () => `/api/hubs/${slugHub.value || 'no-disponible'}`,
  { key: `hub-publico-${slugHub.value}`, ignoreResponseError: true }
)
const hubPublico = computed<HubPublicoEditorial | null>(() => {
  const valor = respuestaHub.value as (HubPublicoEditorial & { modulos?: unknown }) | null | undefined
  return valor && typeof valor.slug === 'string' && Array.isArray(valor.modulos)
    ? valor as HubPublicoEditorial
    : null
})

const analitica = useAnaliticaPublica()
let hubVisitado = ''
watch(
  [() => hubPublico.value?.id, slugHub, analitica.decision],
  ([id, slug, decision]: [string | undefined, string, EstadoAnaliticaPublica]) => {
    const hub = hubPublico.value
    if (!id || !hub || hub.slug !== slug || decision !== 'aceptada') {
      if (hub?.slug !== slug) hubVisitado = ''
      return
    }
    if (hubVisitado === slug) return
    hubVisitado = slug
    void analitica.registrarEvento('hub_view')
  },
  { immediate: true }
)

const configuracion = useRuntimeConfig()
const urlCanonica = computed(() =>
  `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/${slugHub.value}`
)
const tipoHubEtiqueta = computed(() => ({
  topic: 'Tema',
  competition: 'Competición',
  player_collection: 'Colección de jugadores',
  technology: 'Tecnología deportiva',
  gaming: 'Gaming'
}[hubPublico.value?.tipo || 'topic']))

useSeoPont3la10(() => ({
  titulo: construirTituloMetaConMarca(hubPublico.value?.tituloSeo || hubPublico.value?.titulo || 'Página no encontrada'),
  descripcion: hubPublico.value?.descripcionSeo || hubPublico.value?.descripcion
    || 'La página que buscas no está disponible. Vuelve al inicio o explora las últimas noticias de Pont3la10.',
  rutaCanonica: `/${slugHub.value}`,
  robots: hubPublico.value ? robotsIndexables : robotsNoIndex,
  datosEstructurados: hubPublico.value
    ? [
        {
          '@context': 'https://schema.org',
          '@type': ['topic', 'competition', 'player_collection'].includes(hubPublico.value.tipo)
            ? 'CollectionPage'
            : 'WebPage',
          '@id': `${urlCanonica.value}#pagina`,
          url: urlCanonica.value,
          name: hubPublico.value.titulo,
          description: hubPublico.value.descripcion,
          inLanguage: 'es-CO',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: hubPublico.value.modulos.flatMap(modulo =>
              modulo.tipo === 'articulos'
                ? (modulo.articulos || []).map((articulo, indice) => ({
                    '@type': 'ListItem',
                    position: indice + 1,
                    name: articulo.titulo,
                    url: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/articulos/${articulo.slug}`
                  }))
                : []
            )
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: String(configuracion.public.siteUrl).replace(/\/+$/, '') },
            { '@type': 'ListItem', position: 2, name: 'Noticias', item: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/articulos` },
            { '@type': 'ListItem', position: 3, name: hubPublico.value.titulo, item: urlCanonica.value }
          ]
        }
      ]
    : undefined
}))

if (import.meta.server) {
  const eventoSolicitud = useRequestEvent()
  if (eventoSolicitud && !hubPublico.value) {
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
  <div v-if="hubPublico" class="sitio-hub-publico">
    <CabeceraPrincipal />

    <main class="pagina-hub-publico" aria-labelledby="titulo-hub-publico">
      <MigasNavegacion
        :elementos="[
          { etiqueta: 'Inicio', ruta: '/' },
          { etiqueta: 'Noticias', ruta: '/articulos' },
          { etiqueta: hubPublico.titulo }
        ]"
      />

      <header class="cabecera-hub-publico">
        <p class="etiqueta-seccion">{{ tipoHubEtiqueta }}</p>
        <h1 id="titulo-hub-publico">{{ hubPublico.titulo }}</h1>
        <p class="resumen-hub-publico">{{ hubPublico.descripcion }}</p>
      </header>

      <section v-if="hubPublico.cuerpo" class="cuerpo-hub-publico" aria-label="Introducción">
        <p v-for="(parrafo, indice) in hubPublico.cuerpo.split(/\n{2,}/)" :key="indice">
          {{ parrafo }}
        </p>
      </section>

      <RenderizadorHubPublico :modulos="hubPublico.modulos" />
    </main>

    <PiePaginaPrincipal />
  </div>

  <div v-else class="sitio-error">
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
