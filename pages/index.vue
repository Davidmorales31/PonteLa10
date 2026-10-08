<script setup lang="ts">
import { categoriasSitio } from '~/data/sitioPublico'
import PublicidadHouseAd from '~/components/publicidad/HouseAd.vue'
import BotonSeguirEquipo from '~/components/publico/BotonSeguirEquipo.vue'
import BotonSeguirJugador from '~/components/publico/BotonSeguirJugador.vue'
import { buscarPerfilJugadorEuropa } from '~/data/jugadoresColombianosEuropa'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { ArticuloResumen } from '~/types/editorial'
import type { RespuestaResultados } from '~/types/resultados'
import type { PerfilJugadorEuropa } from '~/data/jugadoresColombianosEuropa'
import type { EquipoSeguidoResumen } from '~/types/seguimientoEquipos'
import { esResumenArticuloPublico } from '~/utils/articulosPublicos'

type ArticuloPortada = ArticuloResumen & { fechaPublicacion: string }
interface JugadorSeguidoPortada {
  perfil: PerfilJugadorEuropa
  noticias: ResumenArticuloPublico[]
  error: boolean
}

const { data: resultados, status: estadoResultados } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'resultados-portada',
  lazy: true
})

const { data: respuestaPublicacionesReales } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  key: 'articulos-publicados-portada',
  query: { limite: 6 },
  default: () => [],
  ignoreResponseError: true
})
const { data: respuestaPublicacionDestacada } = await useFetch<ResumenArticuloPublico | null>('/api/articulos/destacada', {
  key: 'articulo-destacado-portada',
  default: () => null,
  ignoreResponseError: true
})
const publicacionesReales = computed(() => Array.isArray(respuestaPublicacionesReales.value)
  ? respuestaPublicacionesReales.value.filter(esResumenArticuloPublico)
  : [])
const publicacionDestacada = computed(() => esResumenArticuloPublico(respuestaPublicacionDestacada.value)
  ? respuestaPublicacionDestacada.value
  : null)
const articulosPublicados = computed<ArticuloPortada[]>(() =>
  publicacionesReales.value.map(articulo => ({
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen,
    categoria: articulo.categoria,
    autor: articulo.autorNombre,
    publicadoHace: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })
      .format(new Date(articulo.publicadoEn)),
    fechaPublicacion: articulo.publicadoEn,
    lecturaMinutos: articulo.lecturaMinutos,
    imagen: articulo.imagen,
    imagenAncho: articulo.imagenAncho
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
    lecturaMinutos: articulo.lecturaMinutos,
    imagen: articulo.imagen,
    imagenAncho: articulo.imagenAncho
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
const { equiposSeguidos, seguimientoEquiposHidratado } = useSeguimientoEquipos()
const resumenesEquiposSeguidos = ref<EquipoSeguidoResumen[]>([])
const cargandoEquiposSeguidos = ref(false)
let secuenciaCargaEquiposSeguidos = 0

watch([seguimientoEquiposHidratado, equiposSeguidos], async ([hidratado, slugs]) => {
  if (!hidratado) return

  const secuencia = ++secuenciaCargaEquiposSeguidos
  if (!slugs.length) {
    resumenesEquiposSeguidos.value = []
    cargandoEquiposSeguidos.value = false
    return
  }

  cargandoEquiposSeguidos.value = true
  try {
    const resumenes = await $fetch<EquipoSeguidoResumen[]>('/api/seguimiento/equipos', {
      query: { slugs: slugs.join(',') }
    })
    if (secuencia === secuenciaCargaEquiposSeguidos) resumenesEquiposSeguidos.value = resumenes
  } catch {
    if (secuencia === secuenciaCargaEquiposSeguidos) resumenesEquiposSeguidos.value = []
  } finally {
    if (secuencia === secuenciaCargaEquiposSeguidos) cargandoEquiposSeguidos.value = false
  }
}, { immediate: true, deep: true })

const { jugadoresSeguidos, seguimientoJugadoresHidratado } = useSeguimientoJugadores()
const actualidadJugadoresSeguidos = ref<JugadorSeguidoPortada[]>([])
const cargandoJugadoresSeguidos = ref(false)
let secuenciaCargaJugadoresSeguidos = 0

watch([seguimientoJugadoresHidratado, jugadoresSeguidos], async ([hidratado, slugs]) => {
  if (!hidratado) return

  const secuencia = ++secuenciaCargaJugadoresSeguidos
  if (!slugs.length) {
    actualidadJugadoresSeguidos.value = []
    cargandoJugadoresSeguidos.value = false
    return
  }

  cargandoJugadoresSeguidos.value = true
  const respuestas = await Promise.all(slugs.map(async (slug): Promise<JugadorSeguidoPortada | null> => {
    const perfil = buscarPerfilJugadorEuropa(slug)
    if (!perfil) return null

    try {
      const respuesta = await $fetch<unknown>(`/api/articulos/entidad/player/${encodeURIComponent(perfil.slug)}`)
      const noticias = Array.isArray(respuesta)
        ? respuesta.filter(esResumenArticuloPublico).slice(0, 2)
        : []
      return { perfil, noticias, error: false }
    } catch {
      return { perfil, noticias: [], error: true }
    }
  }))

  if (secuencia === secuenciaCargaJugadoresSeguidos) {
    actualidadJugadoresSeguidos.value = respuestas.filter((respuesta): respuesta is JugadorSeguidoPortada => respuesta !== null)
    cargandoJugadoresSeguidos.value = false
  }
}, { immediate: true, deep: true })

function fechaEquipoSeguido(valor: string) {
  if (!Number.isFinite(Date.parse(valor))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function obtenerHoraPublicacion(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota'
  }).format(new Date(fecha))
}

const horasPublicacion = computed(() => new Map(
  publicacionesReales.value.map(articulo => [articulo.slug, obtenerHoraPublicacion(articulo.publicadoEn)])
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

      <section
        v-if="seguimientoEquiposHidratado && equiposSeguidos.length"
        class="medio-seccion medio-seguimiento-equipos"
        aria-labelledby="titulo-equipos-seguidos"
      >
        <div class="medio-encabezado">
          <div>
            <h2 id="titulo-equipos-seguidos">Tu fútbol</h2>
            <p>Próximos partidos y noticias de los equipos que sigues.</p>
          </div>
          <NuxtLink to="/liga-colombiana#equipos">Explorar equipos <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <p v-if="cargandoEquiposSeguidos && !resumenesEquiposSeguidos.length" class="estado-seguimiento-home" role="status">Cargando la actualidad de tus equipos…</p>
        <div v-else-if="resumenesEquiposSeguidos.length" class="grilla-equipos-seguidos-home">
          <article v-for="equipo in resumenesEquiposSeguidos" :key="equipo.slug" class="tarjeta-equipo-seguido-home">
            <header>
              <EscudoEquipoPublico v-if="equipo.escudo" :src="equipo.escudo" :alt="`Escudo de ${equipo.nombre}`" :width="42" :height="42" sizes="42px" loading="lazy" />
              <span v-else class="inicial-equipo-seguido" aria-hidden="true">{{ equipo.nombre.slice(0, 1) }}</span>
              <div><NuxtLink :to="`/equipos/${encodeURIComponent(equipo.slug)}`">{{ equipo.nombre }}</NuxtLink><small v-if="equipo.posicion">#{{ equipo.posicion }} · {{ equipo.puntos }} pts</small></div>
              <BotonSeguirEquipo compacto :slug="equipo.slug" :nombre="equipo.nombre" />
            </header>
            <p v-if="equipo.partidoEnVivo" class="partido-seguido-home en-vivo">
              <span>EN VIVO</span>
              <NuxtLink :to="`/partidos/${encodeURIComponent(equipo.partidoEnVivo.slug)}`">{{ equipo.partidoEnVivo.local }} {{ equipo.partidoEnVivo.golesLocal ?? '—' }}–{{ equipo.partidoEnVivo.golesVisitante ?? '—' }} {{ equipo.partidoEnVivo.visitante }}</NuxtLink>
            </p>
            <p v-else-if="equipo.proximoPartido" class="partido-seguido-home">
              <span>PRÓXIMO · {{ fechaEquipoSeguido(equipo.proximoPartido.fechaIso) }}</span>
              <NuxtLink :to="`/partidos/${encodeURIComponent(equipo.proximoPartido.slug)}`">{{ equipo.proximoPartido.local }} vs {{ equipo.proximoPartido.visitante }}</NuxtLink>
            </p>
            <p v-else class="partido-seguido-home estado-seguimiento-home">Sin partidos próximos confirmados.</p>
            <NuxtLink v-if="equipo.noticia" class="noticia-seguida-home" :to="`/articulos/${encodeURIComponent(equipo.noticia.slug)}`">
              <span>NOTICIA</span>{{ equipo.noticia.titulo }}
            </NuxtLink>
            <p v-else class="estado-seguimiento-home">Aún no hay noticias relacionadas confirmadas.</p>
          </article>
        </div>
        <p v-else class="estado-seguimiento-home">No fue posible cargar la actualidad de tus equipos. Puedes abrir sus fichas para ver el calendario y las noticias.</p>
      </section>

      <section
        v-if="seguimientoJugadoresHidratado && jugadoresSeguidos.length"
        class="medio-seccion medio-seguimiento-equipos medio-seguimiento-jugadores"
        aria-labelledby="titulo-jugadores-seguidos"
      >
        <div class="medio-encabezado">
          <div>
            <h2 id="titulo-jugadores-seguidos">Jugadores que sigues</h2>
            <p>Noticias públicas vinculadas editorialmente con sus perfiles.</p>
          </div>
          <NuxtLink to="/colombianos-en-europa">Explorar jugadores <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <p v-if="cargandoJugadoresSeguidos && !actualidadJugadoresSeguidos.length" class="estado-seguimiento-home" role="status">Cargando noticias de los jugadores que sigues…</p>
        <div v-else-if="actualidadJugadoresSeguidos.length" class="grilla-equipos-seguidos-home">
          <article v-for="jugador in actualidadJugadoresSeguidos" :key="jugador.perfil.slug" class="tarjeta-equipo-seguido-home">
            <header>
              <span class="inicial-equipo-seguido" aria-hidden="true">{{ jugador.perfil.nombre.slice(0, 1) }}</span>
              <div>
                <NuxtLink :to="`/jugadores/${encodeURIComponent(jugador.perfil.slug)}`">{{ jugador.perfil.nombre }}</NuxtLink>
                <small>{{ jugador.perfil.club }} · {{ jugador.perfil.competencia }}</small>
              </div>
              <BotonSeguirJugador compacto :slug="jugador.perfil.slug" :nombre="jugador.perfil.nombre" />
            </header>
            <NuxtLink
              v-for="noticia in jugador.noticias"
              :key="noticia.slug"
              class="noticia-seguida-home"
              :to="`/articulos/${encodeURIComponent(noticia.slug)}`"
            >
              <span>{{ noticia.categoria }}</span>{{ noticia.titulo }}
            </NuxtLink>
            <p v-if="jugador.error" class="estado-seguimiento-home">No fue posible cargar sus noticias relacionadas.</p>
            <p v-else-if="!jugador.noticias.length" class="estado-seguimiento-home">Aún no hay artículos públicos vinculados editorialmente con este jugador.</p>
          </article>
        </div>
        <p v-else class="estado-seguimiento-home">No fue posible cargar las noticias de los jugadores que sigues.</p>
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
          image-srcset="/publicidad/pont3la10-labs-640.webp 640w, /publicidad/pont3la10-labs-1024.webp 1024w, /publicidad/pont3la10-labs-1672.webp 1672w"
          image-sizes="(max-width: 700px) calc(100vw - 32px), 520px"
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
        <PublicidadAdsterraSlot formato="nativo" contexto="portada y resultados" />
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
.medio-seguimiento-equipos { border: 1px solid #294467; border-radius: 12px; background: #0c2443; padding: 20px; }
.medio-seguimiento-equipos > .medio-encabezado { margin-bottom: 16px; }
.medio-seguimiento-equipos > .medio-encabezado p { margin: 5px 0 0; color: #a8bbd5; font-size: .8rem; }
.grilla-equipos-seguidos-home { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tarjeta-equipo-seguido-home { min-width: 0; border: 1px solid #294467; border-radius: 10px; background: #07182f; padding: 14px; }
.tarjeta-equipo-seguido-home > header { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tarjeta-equipo-seguido-home > header img, .inicial-equipo-seguido { flex: 0 0 42px; width: 42px; height: 42px; object-fit: contain; }
.inicial-equipo-seguido { display: grid; place-items: center; border-radius: 50%; background: #173657; color: #fff; font-weight: 800; }
.tarjeta-equipo-seguido-home > header > div { display: grid; min-width: 0; flex: 1; gap: 3px; }
.tarjeta-equipo-seguido-home > header > div > a { overflow: hidden; color: #fff; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.tarjeta-equipo-seguido-home > header small, .estado-seguimiento-home { color: #a8bbd5; font-size: .76rem; }
.tarjeta-equipo-seguido-home :deep(.boton-seguimiento-equipo) { min-height: 32px; padding: 5px 9px; }
.tarjeta-equipo-seguido-home :deep(.boton-seguimiento-jugador) { min-height: 32px; padding: 5px 9px; }
.partido-seguido-home { display: grid; gap: 5px; margin: 14px 0 0; border-top: 1px solid #294467; padding-top: 12px; }
.partido-seguido-home > span, .noticia-seguida-home > span { color: #9bc8ff; font-size: .63rem; font-weight: 850; letter-spacing: .06em; }
.partido-seguido-home.en-vivo > span { color: #ff8f98; }
.partido-seguido-home a, .noticia-seguida-home { color: #e7edf6; font-size: .8rem; font-weight: 650; line-height: 1.45; }
.noticia-seguida-home { display: grid; gap: 4px; margin-top: 12px; border-top: 1px solid #294467; padding-top: 11px; text-decoration: none; }
.noticia-seguida-home:hover, .partido-seguido-home a:hover { color: #ffd800; }
.estado-seguimiento-home { margin: 12px 0 0; }
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
  .grilla-equipos-seguidos-home { grid-template-columns: 1fr; }
  .medio-secundarias { gap: 10px; }
  .medio-actualidad { margin-top: 24px; gap: 24px; }
  .medio-resultados { grid-template-columns: 1fr; }
  .medio-explora { align-items: start; flex-direction: column; gap: 12px; }
  .medio-encabezado a { font-size: .66rem; }
  .medio-patrocinios { padding: 18px; }
}
</style>
