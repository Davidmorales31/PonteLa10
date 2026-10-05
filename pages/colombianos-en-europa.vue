<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { construirUrlAbsoluta } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos?tema=colombianos-en-europa&limite=24',
  { default: () => [], key: 'noticias-colombianos-europa' }
)
const noticiaPrincipal = computed(() => noticias.value?.[0] || null)
const ultimasNoticias = computed(() => noticias.value?.slice(1) || [])

useSeoPont3la10(() => ({
  titulo: 'Colombianos en Europa: noticias, goles y actualidad | Pont3la10',
  descripcion: 'Noticias y actualidad de los futbolistas colombianos en Europa: actuaciones, goles, competiciones continentales y ligas nacionales.',
  rutaCanonica: '/colombianos-en-europa',
  seccion: 'Colombianos en Europa',
  datosEstructurados: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Colombianos en Europa',
    description: 'Noticias de futbolistas colombianos en clubes y competiciones europeas.',
    inLanguage: 'es-CO',
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (noticias.value || []).map((noticia, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: noticia.titulo,
        url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/articulos/${noticia.slug}`)
      }))
    }
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
      { '@type': 'ListItem', position: 2, name: 'Noticias', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/articulos') },
      { '@type': 'ListItem', position: 3, name: 'Colombianos en Europa', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa') }
    ]
  }]
}))
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio modulo-colombianos-europa">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol><li><NuxtLink to="/">Inicio</NuxtLink></li><li><NuxtLink to="/articulos">Noticias</NuxtLink></li><li><span class="miga-actual" aria-current="page">Colombianos en Europa</span></li></ol>
    </nav>
    <header class="cabecera-pagina cabecera-noticias-medio cabecera-europa">
      <p class="etiqueta-seccion">FÚTBOL INTERNACIONAL</p>
      <h1>Colombianos en Europa</h1>
      <p>La actualidad de los nuestros: goles, actuaciones y noticias en las ligas y competiciones europeas.</p>
      <nav class="navegacion-europa" aria-label="Explorar fútbol europeo">
        <NuxtLink to="/articulos?categoria=futbol-mundial">Fútbol internacional</NuxtLink>
        <NuxtLink to="/liga-colombiana">Liga colombiana</NuxtLink>
        <NuxtLink to="/articulos">Todas las noticias</NuxtLink>
      </nav>
    </header>

    <section v-if="noticiaPrincipal" class="noticias-europa-grid" aria-label="Noticias de colombianos en Europa">
      <article class="noticia-destacada-medio">
        <NuxtLink v-if="noticiaPrincipal.imagen" :to="`/articulos/${noticiaPrincipal.slug}`" class="imagen-noticia-destacada" tabindex="-1" aria-hidden="true"><img :src="noticiaPrincipal.imagen" :alt="noticiaPrincipal.titulo"></NuxtLink>
        <div class="contenido-noticia-destacada"><p class="etiqueta-seccion">{{ noticiaPrincipal.categoria }} · DESTACADO</p><h2><NuxtLink :to="`/articulos/${noticiaPrincipal.slug}`">{{ noticiaPrincipal.titulo }}</NuxtLink></h2><p>{{ noticiaPrincipal.resumen }}</p><NuxtLink class="boton-leer-noticia" :to="`/articulos/${noticiaPrincipal.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink></div>
      </article>
      <aside class="panel-noticias-lateral panel-jugadores-europa">
        <p class="etiqueta-seccion">PERFILES VERIFICADOS</p>
        <h2>Futbolistas y clubes</h2>
        <p>Publicaremos fichas cuando estén respaldadas por nacionalidad verificada y una vinculación vigente con su club. No mostramos plantillas incompletas ni asignaciones sin confirmar.</p>
        <NuxtLink to="/colombianos-en-europa">Ver noticias relacionadas <span aria-hidden="true">→</span></NuxtLink>
      </aside>
    </section>

    <PublicidadAdsterraSlot formato="leaderboard" contexto="colombianos en europa" />

    <section class="bloque-noticias-europa" aria-labelledby="titulo-noticias-europa">
      <div class="encabezado-noticias-listado"><div><p class="etiqueta-seccion">SEGUIMIENTO EDITORIAL</p><h2 id="titulo-noticias-europa">Últimas noticias de colombianos en Europa</h2></div><span>{{ noticias.length }} {{ noticias.length === 1 ? 'publicación' : 'publicaciones' }}</span></div>
      <div v-if="ultimasNoticias.length" class="grilla-noticias-medio">
        <article v-for="articulo in ultimasNoticias" :key="articulo.slug" class="tarjeta-noticia-medio">
          <NuxtLink v-if="articulo.imagen" :to="`/articulos/${articulo.slug}`" class="imagen-tarjeta-noticia-medio" tabindex="-1" aria-hidden="true"><img :src="articulo.imagen" :alt="articulo.titulo" loading="lazy"></NuxtLink>
          <div><p class="etiqueta-seccion">{{ articulo.categoria }}</p><h3><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink></h3><p class="meta-noticia-medio">{{ new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(articulo.publicadoEn)) }}</p></div>
        </article>
      </div>
      <div v-else class="estado-vacio-articulos">
        <h2>Estamos preparando esta cobertura</h2>
        <p>Esta sección solo muestra publicaciones etiquetadas y verificadas. Mientras se actualiza, explora la actualidad internacional.</p>
        <NuxtLink class="boton-primario" to="/articulos?categoria=futbol-mundial">Ver fútbol internacional</NuxtLink>
      </div>
      <p class="texto-seo-europa">Sigue el recorrido de los futbolistas colombianos en Europa, sus goles, convocatorias y partidos en ligas nacionales, Champions League, Europa League y otros torneos continentales. La cobertura se amplía a partir de noticias confirmadas y no de una lista fija de nombres.</p>
    </section>
  </main>
</template>

<style scoped>
.cabecera-europa { border-bottom: 3px solid #f1c744; }
.cabecera-europa h1 { margin-bottom: 8px; }
body.tema-publico-azul main.modulo-colombianos-europa :is(h2, h3) { color: #edf3ff; }
body.tema-publico-blanco main.modulo-colombianos-europa :is(h2, h3) { color: #08204a; }
body.tema-publico-azul main.modulo-colombianos-europa .etiqueta-seccion { color: #78dcf4; }
body.tema-publico-blanco main.modulo-colombianos-europa .etiqueta-seccion { color: #145996; }
main.modulo-colombianos-europa .encabezado-noticias-listado h2 { color: #08204a; }
main.modulo-colombianos-europa .encabezado-noticias-listado p { color: #145996; }
body.tema-publico-azul main.modulo-colombianos-europa .encabezado-noticias-listado h2 { color: #edf3ff; }
body.tema-publico-azul main.modulo-colombianos-europa .encabezado-noticias-listado p { color: #78dcf4; }
body.tema-publico-blanco main.modulo-colombianos-europa .encabezado-noticias-listado h2 { color: #08204a; }
body.tema-publico-blanco main.modulo-colombianos-europa .encabezado-noticias-listado p { color: #145996; }
.navegacion-europa { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.navegacion-europa a { color: #7be4fb; font-weight: 800; }
.noticias-europa-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, .8fr); gap: 24px; margin-top: 24px; }
.panel-jugadores-europa { align-self: start; }
.panel-jugadores-europa p:not(.etiqueta-seccion), .texto-seo-europa { color: #afc2db; line-height: 1.7; }
.panel-jugadores-europa a { color: #7be4fb; font-weight: 800; }
.bloque-noticias-europa { margin-top: 32px; }
.texto-seo-europa { max-width: 920px; margin-top: 24px; }
body.tema-publico-blanco .panel-jugadores-europa p:not(.etiqueta-seccion), body.tema-publico-blanco .texto-seo-europa { color: #586980; }
body.tema-publico-blanco .panel-jugadores-europa a, body.tema-publico-blanco .navegacion-europa a { color: #145996; }
@media (max-width: 820px) { .noticias-europa-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
