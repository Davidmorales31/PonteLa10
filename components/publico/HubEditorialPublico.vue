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
  tituloSeo?: string
  descripcion: string
  etiquetaSeccion: string
  categoria: string
  rutaCanonica: string
  enlaces: EnlaceHub[]
  datosEstructuradosAdicionales?: Record<string, unknown>[]
  entidadesVerificadas?: number
}

const props = defineProps<{ configuracion: ConfiguracionHub }>()
defineSlots<{
  cabecera(): unknown
  intro(): unknown
  'contenido-adicional'(): unknown
  noticias(props: {
    destacada: ResumenArticuloPublico | null
    recientes: ResumenArticuloPublico[]
    cantidad: number
  }): unknown
}>()
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
  fuenteDisponible: !error.value || (props.configuracion.entidadesVerificadas ?? 0) >= 3,
  entidadesVerificadas: props.configuracion.entidadesVerificadas
}))
const urlHub = computed(() => construirUrlAbsoluta(
  String(configuracionRuntime.public.siteUrl),
  props.configuracion.rutaCanonica
))

useSeoPont3la10(() => ({
  titulo: `${props.configuracion.tituloSeo || props.configuracion.titulo} | Pont3la10`,
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
    },
    ...(props.configuracion.datosEstructuradosAdicionales || [])
  ]
}))

</script>

<template>
  <main class="pagina-contenido pagina-publica-medio modulo-hub-editorial">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: configuracion.titulo }]" />

    <slot name="cabecera">
      <header class="cabecera-pagina cabecera-noticias-medio cabecera-hub-editorial">
        <p class="etiqueta-seccion">{{ configuracion.etiquetaSeccion }}</p>
        <h1>{{ configuracion.titulo }}</h1>
        <p>{{ configuracion.descripcion }}</p>
        <nav class="navegacion-hub-editorial" aria-label="Explorar secciones deportivas">
          <NuxtLink v-for="enlace in configuracion.enlaces" :key="enlace.ruta" :to="enlace.ruta">{{ enlace.etiqueta }}</NuxtLink>
        </nav>
      </header>
    </slot>

    <slot name="intro" />

    <template v-if="$slots.noticias">
      <slot name="noticias" :destacada="destacada" :recientes="noticiasRecientes" :cantidad="listaNoticias.length" />
    </template>
    <template v-else>
      <section v-if="destacada" class="noticias-hub-editorial" aria-label="Cobertura reciente">
        <TarjetaNoticiaPrincipal :articulo="destacada" nivel-titulo="h2" prioridad-alta />
        <PublicidadAdsterraSlot v-if="listaNoticias.length >= 3" formato="leaderboard" :contexto="configuracion.titulo" />
      </section>

      <section id="noticias" class="bloque-noticias-hub-editorial" aria-labelledby="titulo-noticias-hub">
        <div class="encabezado-noticias-listado">
          <div><p class="etiqueta-seccion">ACTUALIDAD VERIFICADA</p><h2 id="titulo-noticias-hub">Últimas noticias</h2></div>
          <span>{{ listaNoticias.length }} {{ listaNoticias.length === 1 ? 'publicación' : 'publicaciones' }}</span>
        </div>
        <div v-if="noticiasRecientes.length" class="grilla-noticias-medio">
          <TarjetaNoticiaSecundaria v-for="articulo in noticiasRecientes" :key="articulo.slug" :articulo="articulo" />
        </div>
        <div v-else class="estado-vacio-articulos">
          <h2>Estamos preparando esta cobertura</h2>
          <p>Mostramos aquí las publicaciones que tienen la categoría editorial correspondiente; no completamos la sección con noticias de otro tema.</p>
          <NuxtLink class="boton-primario" to="/articulos">Explorar todas las noticias</NuxtLink>
        </div>
      </section>
    </template>

    <slot name="contenido-adicional" />
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
