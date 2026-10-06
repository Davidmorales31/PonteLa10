<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { construirUrlAbsoluta, robotsNoIndex } from '~/utils/seo'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'

interface EnlaceHub {
  etiqueta: string
  ruta: string
}

interface ConfiguracionHub {
  titulo: string
  descripcion: string
  etiquetaSeccion: string
  categoria: string
  rutaCanonica: string
  enlaces: EnlaceHub[]
}

const props = defineProps<{ configuracion: ConfiguracionHub }>()
const configuracionRuntime = useRuntimeConfig()
const { data: noticias, error } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  key: `hub-editorial-${props.configuracion.categoria}`,
  query: { categoria: props.configuracion.categoria, limite: '24' },
  default: () => [],
  ignoreResponseError: true
})

const listaNoticias = computed(() => Array.isArray(noticias.value) ? noticias.value : [])
const destacada = computed(() => listaNoticias.value[0] || null)
const noticiasRecientes = computed(() => listaNoticias.value.slice(1))
const puedeIndexarse = computed(() => evaluarIndexabilidad({
  tipo: 'hub',
  articulosDisponibles: listaNoticias.value.length,
  fuenteDisponible: !error.value
}))
const urlHub = computed(() => construirUrlAbsoluta(
  String(configuracionRuntime.public.siteUrl),
  props.configuracion.rutaCanonica
))

useSeoPont3la10(() => ({
  titulo: `${props.configuracion.titulo} | Pont3la10`,
  descripcion: props.configuracion.descripcion,
  rutaCanonica: props.configuracion.rutaCanonica,
  seccion: props.configuracion.etiquetaSeccion,
  robots: puedeIndexarse.value ? undefined : robotsNoIndex,
  datosEstructurados: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: props.configuracion.titulo,
      description: props.configuracion.descripcion,
      inLanguage: 'es-CO',
      url: urlHub.value,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: listaNoticias.value.map((noticia, indice) => ({
          '@type': 'ListItem',
          position: indice + 1,
          name: noticia.titulo,
          url: construirUrlAbsoluta(String(configuracionRuntime.public.siteUrl), `/articulos/${noticia.slug}`)
        }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracionRuntime.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: props.configuracion.titulo, item: urlHub.value }
      ]
    }
  ]
}))

function fechaPublicacion(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeZone: 'America/Bogota'
  }).format(new Date(fecha))
}
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio modulo-hub-editorial">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">{{ configuracion.titulo }}</span></li>
      </ol>
    </nav>

    <header class="cabecera-pagina cabecera-noticias-medio cabecera-hub-editorial">
      <p class="etiqueta-seccion">{{ configuracion.etiquetaSeccion }}</p>
      <h1>{{ configuracion.titulo }}</h1>
      <p>{{ configuracion.descripcion }}</p>
      <nav class="navegacion-hub-editorial" aria-label="Explorar secciones deportivas">
        <NuxtLink v-for="enlace in configuracion.enlaces" :key="enlace.ruta" :to="enlace.ruta">{{ enlace.etiqueta }}</NuxtLink>
      </nav>
    </header>

    <section v-if="destacada" class="noticias-hub-editorial" aria-label="Cobertura reciente">
      <article class="noticia-destacada-medio">
        <NuxtLink
          v-if="destacada.imagen"
          :to="`/articulos/${destacada.slug}`"
          class="imagen-noticia-destacada"
          tabindex="-1"
          aria-hidden="true"
        >
          <img :src="destacada.imagen" :alt="destacada.titulo" width="1280" height="720" fetchpriority="high">
        </NuxtLink>
        <div class="contenido-noticia-destacada">
          <p class="etiqueta-seccion">{{ destacada.categoria }} · DESTACADO</p>
          <h2><NuxtLink :to="`/articulos/${destacada.slug}`">{{ destacada.titulo }}</NuxtLink></h2>
          <p>{{ destacada.resumen }}</p>
          <p class="meta-noticia-medio">{{ fechaPublicacion(destacada.publicadoEn) }}</p>
          <NuxtLink class="boton-leer-noticia" :to="`/articulos/${destacada.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink>
        </div>
      </article>
      <PublicidadAdsterraSlot v-if="listaNoticias.length >= 3" formato="leaderboard" :contexto="configuracion.titulo" />
    </section>

    <section class="bloque-noticias-hub-editorial" aria-labelledby="titulo-noticias-hub">
      <div class="encabezado-noticias-listado">
        <div><p class="etiqueta-seccion">ACTUALIDAD VERIFICADA</p><h2 id="titulo-noticias-hub">Últimas noticias</h2></div>
        <span>{{ listaNoticias.length }} {{ listaNoticias.length === 1 ? 'publicación' : 'publicaciones' }}</span>
      </div>
      <div v-if="noticiasRecientes.length" class="grilla-noticias-medio">
        <article v-for="articulo in noticiasRecientes" :key="articulo.slug" class="tarjeta-noticia-medio">
          <NuxtLink
            v-if="articulo.imagen"
            :to="`/articulos/${articulo.slug}`"
            class="imagen-tarjeta-noticia-medio"
            tabindex="-1"
            aria-hidden="true"
          >
            <img :src="articulo.imagen" :alt="articulo.titulo" width="640" height="360" loading="lazy">
          </NuxtLink>
          <div>
            <p class="etiqueta-seccion">{{ articulo.categoria }}</p>
            <h3><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink></h3>
            <p class="meta-noticia-medio">{{ fechaPublicacion(articulo.publicadoEn) }}</p>
          </div>
        </article>
      </div>
      <div v-else class="estado-vacio-articulos">
        <h2>Estamos preparando esta cobertura</h2>
        <p>Mostramos aquí las publicaciones que tienen la categoría editorial correspondiente; no completamos la sección con noticias de otro tema.</p>
        <NuxtLink class="boton-primario" to="/articulos">Explorar todas las noticias</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.cabecera-hub-editorial { border-bottom: 3px solid #f1c744; }
.navegacion-hub-editorial { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.navegacion-hub-editorial a { color: #7be4fb; font-weight: 800; }
.noticias-hub-editorial { display: grid; gap: 22px; margin-top: 24px; }
.bloque-noticias-hub-editorial { margin-top: 32px; }
body.tema-publico-azul main.modulo-hub-editorial :is(h2, h3) { color: #edf3ff; }
body.tema-publico-blanco main.modulo-hub-editorial :is(h2, h3) { color: #08204a; }
body.tema-publico-azul main.modulo-hub-editorial .etiqueta-seccion { color: #78dcf4; }
body.tema-publico-blanco main.modulo-hub-editorial .etiqueta-seccion,
body.tema-publico-blanco main.modulo-hub-editorial .navegacion-hub-editorial a { color: #145996; }
@media (max-width: 760px) {
  .navegacion-hub-editorial { gap: 10px; }
  .navegacion-hub-editorial a { min-height: 42px; display: inline-flex; align-items: center; }
}
</style>
