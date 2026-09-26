<script setup lang="ts">
import { categoriasSitio } from '~/data/sitioPublico'
import PublicidadHouseAd from '~/components/publicidad/HouseAd.vue'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { ArticuloResumen } from '~/types/editorial'
import type { RespuestaResultados } from '~/types/resultados'

type ArticuloPortada = ArticuloResumen & { fechaPublicacion: string }

const { data: resultados, status: estadoResultados } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'resultados-portada',
  lazy: true
})

const { data: publicacionesReales } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  key: 'articulos-publicados-portada',
  query: { limite: 6 },
  default: () => [],
  ignoreResponseError: true
})
const { data: publicacionDestacada } = await useFetch<ResumenArticuloPublico | null>('/api/articulos/destacada', {
  key: 'articulo-destacado-portada',
  default: () => null,
  ignoreResponseError: true
})
const articulosPublicados = computed<ArticuloPortada[]>(() =>
  (publicacionesReales.value || []).map(articulo => ({
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen,
    categoria: articulo.categoria,
    autor: articulo.autorNombre,
    publicadoHace: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })
      .format(new Date(articulo.publicadoEn)),
    fechaPublicacion: articulo.publicadoEn,
    lecturaMinutos: 4,
    imagen: articulo.imagen
  }))
)
const articuloDestacado = computed<ArticuloPortada | null>(() => {
  const articulo = publicacionDestacada.value
  if (!articulo) return null
  return {
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen,
    categoria: articulo.categoria,
    autor: articulo.autorNombre,
    publicadoHace: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })
      .format(new Date(articulo.publicadoEn)),
    fechaPublicacion: articulo.publicadoEn,
    lecturaMinutos: 4,
    imagen: articulo.imagen
  }
})
const portadaPrincipal = computed(() => articuloDestacado.value || articulosPublicados.value[0] || null)
const noticiasSecundarias = computed(() => articulosPublicados.value
  .filter(articulo => articulo.slug !== portadaPrincipal.value?.slug)
  .slice(0, 3)
)
const ultimasNoticias = computed(() => articulosPublicados.value
  .filter(articulo => articulo.slug !== portadaPrincipal.value?.slug)
)

function obtenerHoraPublicacion(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota'
  }).format(new Date(fecha))
}

const horasPublicacion = computed(() => new Map(
  (publicacionesReales.value || []).map(articulo => [articulo.slug, obtenerHoraPublicacion(articulo.publicadoEn)])
))

useSeoPont3la10(() => ({
  titulo: 'Pont3la10 | Noticias de deporte y tecnología',
  descripcion: 'Noticias, análisis, resultados y especiales interactivos de fútbol, tecnología deportiva y gaming con la jugada clara.',
  rutaCanonica: '/',
  imagen: portadaPrincipal.value?.imagen,
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Pont3la10',
    description: 'Noticias, análisis, resultados y especiales interactivos de deporte y tecnología.',
    inLanguage: 'es-CO'
  }
}))
</script>

<template>
  <div class="portada-medio">
    <EsqueletoResultados v-if="estadoResultados === 'pending'" tipo="franja" />
    <FranjaMarcadores v-else-if="resultados?.partidos.length" :partidos="resultados.partidos" />
    <div class="medio-contenedor">
      <div class="medio-edicion"><span>LA JUGADA CLARA</span><span>Deporte · Tecnología · Actualidad</span></div>
      <section v-if="portadaPrincipal" class="medio-apertura" :class="{ 'sin-secundarias': !noticiasSecundarias.length }" aria-label="Portada editorial">
        <NoticiaPortada :articulo="portadaPrincipal" principal />
        <div v-if="noticiasSecundarias.length" class="medio-secundarias">
          <NoticiaPortada v-for="articulo in noticiasSecundarias" :key="articulo.slug" :articulo="articulo" />
        </div>
      </section>
      <section v-else class="medio-vacio">
        <h1>La actualidad empieza aquí</h1>
        <p>Las noticias aparecerán cuando el equipo editorial las publique.</p>
      </section>

      <div class="medio-actualidad">
        <section aria-labelledby="titulo-ultimas-noticias">
          <div class="medio-encabezado">
            <h2 id="titulo-ultimas-noticias">Últimas noticias</h2>
            <NuxtLink to="/articulos">Ver todas <span aria-hidden="true">→</span></NuxtLink>
          </div>
          <ol v-if="ultimasNoticias.length" class="medio-ultimas">
            <li v-for="articulo in ultimasNoticias" :key="articulo.slug">
              <time :datetime="articulo.fechaPublicacion" :title="articulo.publicadoHace">{{ horasPublicacion.get(articulo.slug) }}</time>
              <NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}<span aria-hidden="true">›</span></NuxtLink>
            </li>
          </ol>
          <p v-else class="medio-texto-suave">Pronto encontrarás más historias aquí.</p>
        </section>
        <PublicidadHouseAd
          image="/publicidad/pont3la10-labs.png"
          label="Publicidad"
          advertiser="Pont3la10 Labs"
          title="Tu negocio necesita más que solo redes sociales."
          description="Diseñamos software, landing pages y productos digitales que convierten."
          cta="Conoce Pont3la10 Labs"
          href="https://labs.pont3la10.com"
          campaign-id="labs-home-2026"
        />
      </div>

      <section v-if="resultados?.partidos.length" class="medio-seccion" aria-labelledby="titulo-resultados-portada">
        <div class="medio-encabezado">
          <h2 id="titulo-resultados-portada">Resultados</h2>
          <NuxtLink to="/resultados">Ver todos los resultados <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="medio-resultados">
          <TarjetaMarcadorCompacto v-for="partido in resultados.partidos.slice(0, 3)" :key="partido.id" :partido="partido" />
        </div>
      </section>

      <section class="medio-explora" aria-label="Explora categorías">
        <h2>Explora</h2>
        <nav aria-label="Categorías">
          <NuxtLink v-for="categoria in categoriasSitio" :key="categoria.ruta" :to="categoria.ruta">{{ categoria.etiqueta }} <span aria-hidden="true">↗</span></NuxtLink>
        </nav>
      </section>

      <section class="medio-patrocinios" aria-label="Anúnciate con nosotros">
        <div><h2>¿Quieres anunciarte en Pont3la10?</h2><p>Conecta con nuestra comunidad de deporte y tecnología.</p></div>
        <a href="mailto:contact@pont3la10.com">contact@pont3la10.com <span aria-hidden="true">→</span></a>
      </section>
    </div>
  </div>
</template>

<style scoped>
.portada-medio { background: #07182f; color: #f5f8ff; padding-bottom: 32px; }
.medio-contenedor { width: min(1240px, calc(100% - 48px)); margin: 0 auto; }
.medio-edicion { display: flex; justify-content: space-between; gap: 16px; padding: 18px 0 14px; color: #9eafc8; font-size: .62rem; letter-spacing: .12em; }
.medio-edicion span:first-child { color: #ffd800; font-weight: 800; }
.medio-apertura { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
.medio-apertura.sin-secundarias { grid-template-columns: 1fr; }
.medio-secundarias { display: grid; gap: 12px; }
.medio-actualidad { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); align-items: start; gap: 24px; margin-top: 28px; }
.medio-encabezado { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 14px; }
.medio-encabezado h2, .medio-explora h2 { margin: 0; color: #fff; font-size: clamp(1.2rem, 2vw, 1.5rem); letter-spacing: -.035em; }
.medio-encabezado a { flex-shrink: 0; color: #9bc8ff; font-size: .72rem; }
.medio-encabezado a:hover { color: #ffd800; }
.medio-ultimas { list-style: none; margin: 0; padding: 0; }
.medio-ultimas li { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: baseline; gap: 12px; padding: 13px 0; border-top: 1px solid #273c58; }
.medio-ultimas li:last-child { border-bottom: 1px solid #273c58; }
.medio-ultimas time { color: #a8bbd5; font-size: .72rem; font-variant-numeric: tabular-nums; }
.medio-ultimas a { display: flex; justify-content: space-between; gap: 14px; color: #e7edf6; font-size: .86rem; font-weight: 550; line-height: 1.45; }
.medio-ultimas a span { color: #ffd800; }
.medio-ultimas a:hover { color: #ffd800; }
.medio-seccion { margin-top: 28px; }
.medio-resultados { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.medio-explora { display: flex; align-items: center; gap: 20px; padding: 26px 0; }
.medio-explora h2 { flex-shrink: 0; }
.medio-explora nav { display: flex; flex-wrap: wrap; gap: 8px; }
.medio-explora a { display: inline-flex; align-items: center; gap: 14px; border: 1px solid #294467; border-radius: 24px; background: #102c51; color: #dbe6f5; font-size: .72rem; padding: 10px 14px; }
.medio-explora a:hover { border-color: #ffd800; color: #ffd800; }
.medio-patrocinios { display: flex; justify-content: space-between; align-items: center; gap: 20px; border: 1px solid #294467; border-left: 3px solid #ffd800; border-radius: 8px; padding: 20px 24px; background: #0c2443; }
.medio-patrocinios h2 { color: #fff; margin: 0; font-size: .98rem; }
.medio-patrocinios p { color: #a8bbd5; margin: 5px 0 0; font-size: .8rem; }
.medio-patrocinios a { flex-shrink: 0; color: #fff; border: 1px solid #50729e; border-radius: 6px; padding: 11px 14px; font-size: .75rem; }
.medio-patrocinios a:hover { border-color: #ffd800; }
.medio-texto-suave, .medio-vacio p { color: #a8bbd5; }
.medio-vacio { padding: 36px 0; }
.medio-vacio h1 { font-size: 2rem; }
@media (max-width: 900px) {
  .medio-apertura { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
  .medio-actualidad { gap: 20px; }
  .medio-patrocinios { align-items: start; flex-direction: column; }
}
@media (max-width: 700px) {
  .medio-contenedor { width: calc(100% - 32px); }
  .medio-edicion { font-size: .55rem; letter-spacing: .07em; }
  .medio-apertura, .medio-actualidad { grid-template-columns: 1fr; }
  .medio-secundarias { gap: 10px; }
  .medio-actualidad { margin-top: 24px; gap: 24px; }
  .medio-resultados { grid-template-columns: 1fr; }
  .medio-explora { align-items: start; flex-direction: column; gap: 12px; }
  .medio-encabezado a { font-size: .66rem; }
  .medio-patrocinios { padding: 18px; }
}
</style>
