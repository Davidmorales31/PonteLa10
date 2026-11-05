<script setup lang="ts">
import BarraCompartirArticulo from '~/components/editorial/BarraCompartirArticulo.vue'
import ContenidoArticuloPublico from '~/components/editorial/ContenidoArticuloPublico.vue'
import SeccionArticulosRelacionados from '~/components/editorial/SeccionArticulosRelacionados.vue'
import SeccionEntidadesRelacionadas from '~/components/editorial/SeccionEntidadesRelacionadas.vue'
import type {
  ArticuloPublicoEditorial,
  ResumenArticuloPublico
} from '~/types/contenidoEditorial'
import {
  construirTituloMetaConMarca,
  robotsIndexables,
  robotsNoIndex
} from '~/utils/seo'
import { seleccionarArticulosRelacionados } from '~/utils/editorial/distribucion'
import { resolverDestinoPromocionalReproductor } from '~/utils/publicidad/destinoPromocionalReproductor'
import {
  crearAutorEstructurado,
  obtenerPerfilAutorPublico
} from '~/utils/perfilesAutoresPublicos'
import type { ContextoAnaliticaPagina, EstadoAnaliticaPublica } from '~/utils/analiticaPublica'

const ruta = useRoute()
const slugActual = computed(() => String(ruta.params.slug || ''))
const { data: articuloPublicado } = await useFetch<ArticuloPublicoEditorial>(
  () => `/api/articulos/${slugActual.value}`,
  {
    key: `articulo-publico-${slugActual.value}`,
    ignoreResponseError: true
  }
)
if (articuloPublicado.value) useCachePublica('articulo')
const contextoAnalitica = useState<ContextoAnaliticaPagina | null>('contexto-analitica-pagina', () => null)
watchEffect(() => {
  const articulo = articuloPublicado.value
  contextoAnalitica.value = articulo
    ? {
        ruta: `/articulos/${articulo.slug}`,
        category: articulo.categoria?.slug
      }
    : null
})

const { data: publicacionesDisponibles } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos',
  {
    key: 'articulos-relacionados-publicos',
    query: { limite: 20 },
    default: () => []
  }
)

const analitica = useAnaliticaPublica()
const publicidadAutorizada = analitica.publicidadAutorizada
let articuloVisitado = ''
watch(
  [() => articuloPublicado.value?.id, slugActual, analitica.decision],
  ([id, slug, decision]: [string | undefined, string, EstadoAnaliticaPublica]) => {
    const articulo = articuloPublicado.value
    if (!id || !articulo || articulo.slug !== slug || decision !== 'aceptada') {
      if (articulo?.slug !== slug) articuloVisitado = ''
      return
    }

    if (articuloVisitado === slug) return
    articuloVisitado = slug
    void analitica.registrarEvento('article_view')
  },
  { immediate: true }
)

const articulosRelacionados = computed(() => {
  if (!articuloPublicado.value) return []

  return seleccionarArticulosRelacionados(
    publicacionesDisponibles.value,
    articuloPublicado.value.id,
    articuloPublicado.value.categoria?.nombre || 'Actualidad'
  )
})

if (!articuloPublicado.value) {
  if (import.meta.server) {
    const eventoSolicitud = useRequestEvent()
    eventoSolicitud?.node?.res?.setHeader('X-Robots-Tag', 'noindex, follow')
  }

  throw createError({ statusCode: 404, statusMessage: 'Artículo no encontrado' })
}

const configuracion = useRuntimeConfig()
const primerClicAnuncioYoutube = ref(false)
const urlCanalYoutube = 'https://www.youtube.com/@SomosNoobs'
const claveAnuncioYoutube = computed(() => `pont3la10:anuncio-articulo-youtube:v1:${slugActual.value}`)
const urlsPromocionalesYoutube = computed(() => String(configuracion.public.adsterraMatchPromoUrls || '')
  .split(',')
  .map((valor) => {
    try {
      const url = new URL(valor.trim())
      return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
    } catch {
      return ''
    }
  })
  .filter(Boolean))
const puedeAbrirAnuncioYoutube = computed(() => publicidadAutorizada.value && urlsPromocionalesYoutube.value.length > 0)
const rotuloAccesoYoutube = computed(() => {
  if (!puedeAbrirAnuncioYoutube.value) return 'Abrir en YouTube'
  return primerClicAnuncioYoutube.value ? 'Continuar a YouTube' : 'Publicidad antes de YouTube'
})

function restaurarEstadoAnuncioYoutube() {
  try {
    primerClicAnuncioYoutube.value = window.sessionStorage.getItem(claveAnuncioYoutube.value) === '1'
  } catch {
    primerClicAnuncioYoutube.value = false
  }
}

onMounted(restaurarEstadoAnuncioYoutube)
watch(slugActual, () => {
  if (import.meta.client) restaurarEstadoAnuncioYoutube()
})

function abrirDestinoExterno(url: string) {
  const ventana = window.open(url, '_blank', 'noopener,noreferrer')
  if (ventana) ventana.opener = null
}

function abrirAccesoYoutube() {
  if (!import.meta.client) return

  if (!primerClicAnuncioYoutube.value && puedeAbrirAnuncioYoutube.value) {
    const destino = resolverDestinoPromocionalReproductor(1, urlsPromocionalesYoutube.value)
    if (destino) {
      abrirDestinoExterno(destino)
      primerClicAnuncioYoutube.value = true
      try {
        window.sessionStorage.setItem(claveAnuncioYoutube.value, '1')
      } catch {
        // Se mantiene el primer clic en memoria si sessionStorage no esta disponible.
      }
      return
    }
  }

  abrirDestinoExterno(urlCanalYoutube)
}

const urlCanonica = computed(() =>
  `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/articulos/${slugActual.value}`
)
const tituloSeo = computed(() => articuloPublicado.value
  ? articuloPublicado.value.seoTitulo || articuloPublicado.value.titulo
  : 'Artículo no encontrado'
)
const tituloMeta = computed(() => construirTituloMetaConMarca(tituloSeo.value))
const descripcionSeo = computed(() => articuloPublicado.value
  ? articuloPublicado.value.seoDescripcion || articuloPublicado.value.resumen
  : 'La publicación solicitada no está disponible.'
)
const imagenSeo = computed(() => articuloPublicado.value?.portada?.url
  || undefined
)
const imagenAltSeo = computed(() => articuloPublicado.value?.portada?.textoAlternativo
  || articuloPublicado.value?.titulo
  || 'Pont3la10'
)
const autorEstructurado = computed(() => {
  const nombre = articuloPublicado.value?.autorNombre || 'Equipo Pont3la10'
  return crearAutorEstructurado(nombre, String(configuracion.public.siteUrl))
})

useSeoPont3la10(() => ({
  titulo: tituloMeta.value,
  descripcion: descripcionSeo.value,
  rutaCanonica: `/articulos/${slugActual.value}`,
  imagen: imagenSeo.value,
  imagenAlt: imagenAltSeo.value,
  imagenAncho: articuloPublicado.value?.portada?.ancho,
  imagenAlto: articuloPublicado.value?.portada?.alto,
  tipoOpenGraph: 'article',
  fechaPublicacion: articuloPublicado.value?.publicadoEn,
  fechaModificacion: articuloPublicado.value?.modificadoEn || articuloPublicado.value?.publicadoEn,
  seccion: articuloPublicado.value?.categoria?.nombre,
  robots: articuloPublicado.value ? robotsIndexables : robotsNoIndex,
  datosEstructurados: articuloPublicado.value
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          '@id': `${urlCanonica.value}#articulo`,
          url: urlCanonica.value,
          headline: articuloPublicado.value.titulo,
          description: descripcionSeo.value,
          image: articuloPublicado.value.portada
            ? {
                '@type': 'ImageObject',
                url: articuloPublicado.value.portada.url,
                width: articuloPublicado.value.portada.ancho || undefined,
                height: articuloPublicado.value.portada.alto || undefined,
                caption: articuloPublicado.value.portada.pieDeFoto || undefined
              }
            : undefined,
          thumbnailUrl: articuloPublicado.value.portada?.url,
          datePublished: articuloPublicado.value.publicadoEn,
          dateModified: articuloPublicado.value.modificadoEn || articuloPublicado.value.publicadoEn,
          articleSection: articuloPublicado.value.categoria?.nombre,
          inLanguage: 'es-CO',
          isAccessibleForFree: true,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': urlCanonica.value
          },
          author: autorEstructurado.value,
          about: articuloPublicado.value.relacionesEntidades
            ?.filter(relacion => relacion.relacion === 'about')
            .map(relacion => ({
              '@type': 'Thing',
              name: relacion.nombre,
              url: construirUrlAbsoluta(String(configuracion.public.siteUrl), relacion.ruta)
            })),
          mentions: articuloPublicado.value.relacionesEntidades
            ?.filter(relacion => relacion.relacion === 'mentions')
            .map(relacion => ({
              '@type': 'Thing',
              name: relacion.nombre,
              url: construirUrlAbsoluta(String(configuracion.public.siteUrl), relacion.ruta)
            })),
          publisher: {
            '@type': 'Organization',
            '@id': `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/#organizacion`,
            name: 'Pont3la10',
            logo: {
              '@type': 'ImageObject',
              url: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/brand/pont3la10_logo_06_horizontal_sobre_blanco.png`
            }
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Inicio',
              item: String(configuracion.public.siteUrl).replace(/\/+$/, '')
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Noticias',
              item: `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/articulos`
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: articuloPublicado.value.titulo,
              item: urlCanonica.value
            }
          ]
        }
      ]
    : undefined
}))

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(fecha)).replace(/[\u00a0\u202f]/g, ' ')
}

const fechaActualizacion = computed(() => {
  const publicadoEn = articuloPublicado.value?.publicadoEn
  const modificadoEn = articuloPublicado.value?.modificadoEn
  if (!publicadoEn || !modificadoEn) return null

  const publicacionMs = Date.parse(publicadoEn)
  const modificacionMs = Date.parse(modificadoEn)
  return Number.isFinite(publicacionMs)
    && Number.isFinite(modificacionMs)
    && modificacionMs > publicacionMs
    ? modificadoEn
    : null
})
</script>

<template>
  <article v-if="articuloPublicado" class="detalle-articulo detalle-articulo-publicado">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: articuloPublicado.categoria?.nombre || 'Noticias', ruta: '/articulos' }, { etiqueta: articuloPublicado.titulo }]" />
    <header class="cabecera-articulo-publicado">
      <p class="etiqueta-seccion">
        {{ articuloPublicado.categoria?.nombre || 'Actualidad' }}
      </p>
      <h1>{{ articuloPublicado.titulo }}</h1>
      <p class="resumen-articulo">{{ articuloPublicado.resumen }}</p>
      <p class="meta-articulo">
        <NuxtLink
          v-if="obtenerPerfilAutorPublico(articuloPublicado.autorNombre)"
          :to="`/autores/${obtenerPerfilAutorPublico(articuloPublicado.autorNombre)?.slug}`"
        >
          {{ articuloPublicado.autorNombre }}
        </NuxtLink>
        <span v-else>{{ articuloPublicado.autorNombre }}</span>
        ·
        <time :datetime="articuloPublicado.publicadoEn">
          {{ formatearFecha(articuloPublicado.publicadoEn) }}
        </time>
        <span v-if="fechaActualizacion" class="fecha-actualizacion-articulo">
          · Actualizado
          <time :datetime="fechaActualizacion">{{ formatearFecha(fechaActualizacion) }}</time>
        </span>
      </p>
    </header>

    <aside
      v-if="articuloPublicado.notaCorreccion"
      class="nota-correccion-articulo"
      role="note"
      aria-label="Nota de corrección editorial"
    >
      <strong>Nota de corrección</strong>
      <p>{{ articuloPublicado.notaCorreccion }}</p>
    </aside>

    <BarraCompartirArticulo
      :titulo="articuloPublicado.titulo"
      :texto="articuloPublicado.textoSocial || articuloPublicado.resumen"
      :url="urlCanonica"
    />

    <figure v-if="articuloPublicado.portada" class="portada-articulo-publicado">
      <div class="portada-reproductor-youtube">
        <ImagenEditorialPublica
          class="imagen-detalle"
          :src="articuloPublicado.portada.url"
          :alt="articuloPublicado.portada.textoAlternativo"
          :width="articuloPublicado.portada.ancho || 1600"
          :height="articuloPublicado.portada.alto || 900"
          :ancho-original="articuloPublicado.portada.ancho"
          sizes="(max-width: 760px) 100vw, 1200px"
          loading="eager"
          prioridad-alta
        />
        <button
          class="boton-reproductor-youtube"
          type="button"
          :aria-label="puedeAbrirAnuncioYoutube && !primerClicAnuncioYoutube ? 'Primer clic: abrir publicidad; segundo clic: canal SomosNoobs en YouTube' : 'Abrir canal SomosNoobs en YouTube'"
          @click="abrirAccesoYoutube"
        >
          <span class="boton-reproducir-youtube" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z" /></svg></span>
          <span class="barra-reproductor-youtube" aria-hidden="true">
            <img src="/brand/pont3la10_logo_login_blanco-180.webp" alt="" width="118" height="23">
            <span class="separador-reproductor-youtube" />
            <span class="rotulo-reproductor-youtube">{{ rotuloAccesoYoutube }}</span>
            <IconoRedSocial red="youtube" />
          </span>
          <span class="aviso-reproductor-youtube">{{ puedeAbrirAnuncioYoutube ? 'Primer clic: publicidad · vuelve y pulsa para YouTube' : 'Abrir canal de Pont3la10 en YouTube' }}</span>
        </button>
      </div>
      <figcaption
        v-if="articuloPublicado.portada.pieDeFoto || articuloPublicado.portada.credito || articuloPublicado.portada.fuenteFotoUrl"
      >
        <span>{{ articuloPublicado.portada.pieDeFoto }}</span>
        <small v-if="articuloPublicado.portada.credito">
          {{ articuloPublicado.portada.credito }}
        </small>
        <a
          v-if="articuloPublicado.portada.fuenteFotoUrl"
          :href="articuloPublicado.portada.fuenteFotoUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          Ver foto y licencia
        </a>
      </figcaption>
    </figure>

    <PublicidadAdsterraSlot formato="nativo" contexto="artículo deportivo" />
    <ContenidoArticuloPublico :documento="articuloPublicado.documento" />
    <SeccionEntidadesRelacionadas
      :relaciones="articuloPublicado.relacionesEntidades"
      :proximo-partido="articuloPublicado.proximoPartidoEntidad"
    />

    <footer
      v-if="articuloPublicado.fuente.url || articuloPublicado.fuente.creditos"
      class="fuentes-articulo-publicado"
    >
      <strong>Fuentes y créditos</strong>
      <a
        v-if="articuloPublicado.fuente.url"
        :href="articuloPublicado.fuente.url"
        target="_blank"
        rel="noreferrer noopener"
      >
        {{ articuloPublicado.fuente.nombre || 'Fuente original' }}
      </a>
      <p v-if="articuloPublicado.fuente.creditos">
        {{ articuloPublicado.fuente.creditos }}
      </p>
    </footer>

    <BarraCompartirArticulo
      variante="inferior"
      :titulo="articuloPublicado.titulo"
      :texto="articuloPublicado.textoSocial || articuloPublicado.resumen"
      :url="urlCanonica"
    />

    <PublicidadAdsterraEnlacePatrocinado />

    <SeccionArticulosRelacionados :articulos="articulosRelacionados" />
  </article>
</template>
