<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { construirUrlAbsoluta, robotsNoIndex } from '~/utils/seo'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import { jugadoresColombianosEuropa } from '~/data/jugadoresColombianosEuropa'

const configuracion = useRuntimeConfig()
const { data: respuestaNoticias, error } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos?tema=colombianos-en-europa&limite=24',
  { default: () => [], key: 'noticias-colombianos-europa' }
)
const noticias = computed(() => Array.isArray(respuestaNoticias.value) ? respuestaNoticias.value : [])
const noticiaPrincipal = computed(() => noticias.value[0] || null)
const ultimasNoticias = computed(() => noticias.value.slice(1))
const perfilesIndexables = computed(() => jugadoresColombianosEuropa.filter(perfil => evaluarIndexabilidad({
  tipo: 'jugador',
  ...perfil
})))
const indexable = computed(() => evaluarIndexabilidad({
  tipo: 'hub',
  articulosDisponibles: noticias.value.length,
  entidadesVerificadas: perfilesIndexables.value.length,
  fuenteDisponible: !error.value
}))

useSeoPont3la10(() => ({
  titulo: 'Colombianos en Europa: jugadores y noticias | Pont3la10',
  descripcion: 'Perfiles verificados y noticias de futbolistas colombianos en Europa: club actual, posición, calendario oficial y actualidad.',
  rutaCanonica: '/colombianos-en-europa',
  seccion: 'Colombianos en Europa',
  robots: indexable.value ? undefined : robotsNoIndex,
  datosEstructurados: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Colombianos en Europa',
    description: 'Noticias de futbolistas colombianos en clubes y competiciones europeas.',
    inLanguage: 'es-CO',
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa'),
    mainEntity: {
      '@type': 'ItemList',
        itemListElement: [
          ...perfilesIndexables.value.map((perfil, indice) => ({
            '@type': 'ListItem',
            position: indice + 1,
            name: perfil.nombre,
            url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/jugadores/${perfil.slug}`)
          })),
          ...noticias.value.map((noticia, indice) => ({
            '@type': 'ListItem',
            position: perfilesIndexables.value.length + indice + 1,
            name: noticia.titulo,
            url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/articulos/${noticia.slug}`)
          }))
        ]
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

    <section class="noticias-europa-grid" aria-label="Noticias y perfiles de colombianos en Europa">
      <article v-if="noticiaPrincipal" class="noticia-destacada-medio">
        <NuxtLink v-if="noticiaPrincipal.imagen" :to="`/articulos/${noticiaPrincipal.slug}`" class="imagen-noticia-destacada" tabindex="-1" aria-hidden="true">
          <ImagenEditorialPublica
            :src="noticiaPrincipal.imagen"
            :alt="noticiaPrincipal.titulo"
            width="1280"
            height="720"
            :ancho-original="noticiaPrincipal.imagenAncho"
            sizes="(max-width: 760px) 100vw, 1280px"
            loading="eager"
            prioridad-alta
          />
        </NuxtLink>
        <div class="contenido-noticia-destacada"><p class="etiqueta-seccion">{{ noticiaPrincipal.categoria }} · DESTACADO</p><h2><NuxtLink :to="`/articulos/${noticiaPrincipal.slug}`">{{ noticiaPrincipal.titulo }}</NuxtLink></h2><p>{{ noticiaPrincipal.resumen }}</p><NuxtLink class="boton-leer-noticia" :to="`/articulos/${noticiaPrincipal.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink></div>
      </article>
      <article v-else class="noticia-destacada-medio">
        <div class="contenido-noticia-destacada"><p class="etiqueta-seccion">SEGUIMIENTO EDITORIAL</p><h2>Historias de colombianos en Europa</h2><p>Consulta las fichas verificadas y las noticias publicadas cuando haya cobertura editorial confirmada.</p><NuxtLink class="boton-leer-noticia" to="/articulos?categoria=futbol-mundial">Explorar fútbol internacional <span aria-hidden="true">→</span></NuxtLink></div>
      </article>
      <aside class="panel-noticias-lateral panel-jugadores-europa" aria-labelledby="titulo-perfiles-verificados">
        <p class="etiqueta-seccion">PERFILES VERIFICADOS</p>
        <h2 id="titulo-perfiles-verificados">Futbolistas y clubes</h2>
        <p>Fichas con nacionalidad, posición y club contrastados en fuentes oficiales. Ampliamos el listado cuando podemos verificar cada dato.</p>
        <ul class="lista-perfiles-europa">
          <li v-for="perfil in jugadoresColombianosEuropa" :key="perfil.slug">
            <NuxtLink :to="`/jugadores/${perfil.slug}`">
              <span class="iniciales-perfil-europa" aria-hidden="true">{{ perfil.club.slice(0, 2).toLocaleUpperCase('es-CO') }}</span>
              <span><strong>{{ perfil.nombre }}</strong><small>{{ perfil.club }} · {{ perfil.posicion }}</small></span>
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </ul>
      </aside>
    </section>

    <PublicidadAdsterraSlot v-if="noticias.length >= 3" formato="leaderboard" contexto="colombianos en europa" />

    <section class="bloque-noticias-europa" aria-labelledby="titulo-noticias-europa">
      <div class="encabezado-noticias-listado"><div><p class="etiqueta-seccion">SEGUIMIENTO EDITORIAL</p><h2 id="titulo-noticias-europa">Últimas noticias de colombianos en Europa</h2></div><span>{{ noticias.length }} {{ noticias.length === 1 ? 'publicación' : 'publicaciones' }}</span></div>
      <div v-if="ultimasNoticias.length" class="grilla-noticias-medio">
        <article v-for="articulo in ultimasNoticias" :key="articulo.slug" class="tarjeta-noticia-medio">
          <NuxtLink v-if="articulo.imagen" :to="`/articulos/${articulo.slug}`" class="imagen-tarjeta-noticia-medio" tabindex="-1" aria-hidden="true">
            <ImagenEditorialPublica
              :src="articulo.imagen"
              :alt="articulo.titulo"
              width="640"
              height="360"
              :ancho-original="articulo.imagenAncho"
              sizes="(max-width: 760px) 100vw, 640px"
            />
          </NuxtLink>
          <div><p class="etiqueta-seccion">{{ articulo.categoria }}</p><h3><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink></h3><p class="meta-noticia-medio">{{ new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(articulo.publicadoEn)) }}</p></div>
        </article>
      </div>
      <div v-else class="estado-vacio-articulos">
        <h2>Estamos preparando esta cobertura</h2>
        <p>Esta sección solo muestra publicaciones etiquetadas y verificadas. Mientras se actualiza, explora la actualidad internacional.</p>
        <NuxtLink class="boton-primario" to="/articulos?categoria=futbol-mundial">Ver fútbol internacional</NuxtLink>
      </div>
      <PublicidadAdsterraSlot
        v-if="ultimasNoticias.length >= 6"
        formato="leaderboard"
        contexto="colombianos en Europa · archivo de actualidad"
      />
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
.lista-perfiles-europa { display: grid; gap: 8px; list-style: none; padding: 0; margin: 18px 0 0; }
.lista-perfiles-europa li { border-top: 1px solid rgba(255,255,255,.12); }
.lista-perfiles-europa a { display: flex; align-items: center; gap: 10px; padding: 10px 0; color: inherit; text-decoration: none; }
.lista-perfiles-europa a > span:nth-child(2) { display: grid; flex: 1; gap: 3px; }
.lista-perfiles-europa strong { color: #edf3ff; }
.lista-perfiles-europa small { color: #afc2db; font-size: .78rem; }
.iniciales-perfil-europa { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border: 1px solid rgba(120,220,244,.6); border-radius: 50%; color: #78dcf4; font-size: .72rem; }
.panel-jugadores-europa p:not(.etiqueta-seccion), .texto-seo-europa { color: #afc2db; line-height: 1.7; }
.panel-jugadores-europa a { color: #7be4fb; font-weight: 800; }
.bloque-noticias-europa { margin-top: 32px; }
.texto-seo-europa { max-width: 920px; margin-top: 24px; }
body.tema-publico-blanco .panel-jugadores-europa p:not(.etiqueta-seccion), body.tema-publico-blanco .texto-seo-europa { color: #586980; }
body.tema-publico-blanco .panel-jugadores-europa a, body.tema-publico-blanco .navegacion-europa a { color: #145996; }
body.tema-publico-blanco .lista-perfiles-europa strong { color: #08204a; }
body.tema-publico-blanco .lista-perfiles-europa small { color: #586980; }
body.tema-publico-blanco .iniciales-perfil-europa { border-color: #145996; color: #145996; }
@media (max-width: 820px) { .noticias-europa-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
