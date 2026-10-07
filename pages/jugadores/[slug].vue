<script setup lang="ts">
import type { PartidoResultado, RespuestaResultados } from '~/types/resultados'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { buscarPerfilJugadorEuropa, partidoCorrespondeAClubJugador } from '~/data/jugadoresColombianosEuropa'
import { construirUrlAbsoluta } from '~/utils/seo'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'

const route = useRoute()
const configuracion = useRuntimeConfig()
const slug = computed(() => String(route.params.slug || ''))
const perfil = computed(() => buscarPerfilJugadorEuropa(slug.value))

if (!perfil.value) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos una ficha pública para este jugador.' })
}

const ficha = perfil.value
const { data: respuestaNoticias, error: errorNoticias } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos',
  {
    key: `articulos-jugador-${ficha.slug}`,
    query: { buscar: ficha.nombre, limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }
)
const noticiasRelacionadas = computed(() => {
  const nombre = normalizarBusqueda(ficha.nombre)
  return (Array.isArray(respuestaNoticias.value) ? respuestaNoticias.value : [])
    .filter(articulo => normalizarBusqueda(`${articulo.titulo} ${articulo.resumen}`).includes(nombre))
    .slice(0, 6)
})

const { data: respuestaResultados } = await useFetch<RespuestaResultados>(
  '/api/resultados',
  {
    key: 'ficha-jugador-resultados-dia',
    query: { deporte: 'futbol', timeZone: 'America/Bogota' },
    default: (): RespuestaResultados => ({ partidos: [], clasificacion: [], actualizadoEn: '', origen: 'base-datos' }),
    ignoreResponseError: true
  }
)

const ahoraIso = useState(`ficha-jugador-ahora-${ficha.slug}`, () => new Date().toISOString())
const partidosClubHoy = computed(() => (Array.isArray(respuestaResultados.value?.partidos)
  ? respuestaResultados.value.partidos
  : [])
  .filter(partido => partidoCorrespondeAClubJugador(partido, ficha))
  .filter(partido => partido.estado === 'en-vivo' || Date.parse(partido.fechaIso) >= Date.parse(ahoraIso.value))
  .sort((primero, segundo) => Date.parse(primero.fechaIso) - Date.parse(segundo.fechaIso)))

const indexable = computed(() => evaluarIndexabilidad({
  tipo: 'jugador',
  slug: ficha.slug,
  nombre: ficha.nombre,
  nacionalidad: ficha.nacionalidad,
  club: ficha.club,
  posicion: ficha.posicion,
  competencia: ficha.competencia,
  descripcionVerificada: ficha.descripcionVerificada,
  fuenteOficialUrl: ficha.fuenteOficialUrl,
  verificadoEn: ficha.verificadoEn
}))
const urlCanonica = computed(() => construirUrlAbsoluta(String(configuracion.public.siteUrl), `/jugadores/${ficha.slug}`))
const entidadPersona = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: ficha.nombre,
  nationality: { '@type': 'Country', name: ficha.nacionalidad },
  jobTitle: ficha.posicion,
  memberOf: {
    '@type': 'SportsTeam',
    name: ficha.club,
    sport: 'Soccer',
    url: ficha.urlClub,
    memberOf: { '@type': 'SportsOrganization', name: `${ficha.competencia} · ${ficha.paisCompetencia}` }
  },
  url: urlCanonica.value,
  sameAs: [ficha.fuenteOficialUrl]
}))

useSeoPont3la10(() => ({
  titulo: `${ficha.nombre}: club, posición y actualidad | Pont3la10`,
  descripcion: `${ficha.nombre}: nacionalidad, posición, club actual, calendario oficial y noticias relacionadas. Datos verificados con fuentes oficiales.`,
  rutaCanonica: `/jugadores/${ficha.slug}`,
  seccion: 'Colombianos en Europa',
  robots: indexable.value ? undefined : 'noindex, follow',
  datosEstructurados: [
    entidadPersona.value,
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Ficha de ${ficha.nombre}`,
      url: urlCanonica.value,
      mainEntity: entidadPersona.value
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Colombianos en Europa', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/colombianos-en-europa') },
        { '@type': 'ListItem', position: 3, name: ficha.nombre, item: urlCanonica.value }
      ]
    }
  ]
}))

function normalizarBusqueda(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
}

function fechaPartido(partido: PartidoResultado): string {
  const fecha = Date.parse(partido.fechaIso)
  if (!Number.isFinite(fecha)) return 'Horario por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Bogota'
  }).format(new Date(fecha)) + ' · hora de Colombia'
}

function estadoPartido(partido: PartidoResultado): string {
  return partido.estado === 'en-vivo' ? 'En vivo' : 'Programado'
}

function clubesPartido(partido: PartidoResultado): string {
  return `${partido.equipoLocal.nombre} vs. ${partido.equipoVisitante.nombre}`
}

function fechaVerificacion(valor: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(valor))
}

onMounted(() => {
  ahoraIso.value = new Date().toISOString()
})
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio pagina-jugador-europa">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><NuxtLink to="/colombianos-en-europa">Colombianos en Europa</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">{{ ficha.nombre }}</span></li>
      </ol>
    </nav>

    <header class="cabecera-jugador panel-jugador">
      <div class="jugador-identidad">
        <span class="iniciales-club" aria-hidden="true">{{ ficha.club.slice(0, 2).toLocaleUpperCase('es-CO') }}</span>
        <div>
          <p class="etiqueta-seccion">FICHA DE FUTBOLISTA · COLOMBIANO EN EUROPA</p>
          <h1>{{ ficha.nombre }}</h1>
          <p class="resumen-cabecera-jugador">{{ ficha.posicion }} · {{ ficha.nacionalidad }}</p>
        </div>
      </div>
      <div class="club-jugador">
        <p class="etiqueta-seccion">CLUB ACTUAL VERIFICADO</p>
        <h2><a :href="ficha.urlClub" target="_blank" rel="noopener noreferrer">{{ ficha.club }}</a></h2>
        <p>{{ ficha.competencia }} · {{ ficha.paisCompetencia }}</p>
      </div>
    </header>

    <div class="contenido-jugador-grid">
      <div class="columna-jugador-principal">
        <section class="panel-jugador" aria-labelledby="titulo-actualidad-jugador">
          <p class="etiqueta-seccion">ACTUALIDAD VERIFICADA</p>
          <h2 id="titulo-actualidad-jugador">{{ ficha.nombre }} hoy</h2>
          <p class="texto-descripcion-jugador">{{ ficha.descripcionVerificada }}</p>
          <p class="fecha-verificacion-jugador">Datos contrastados el {{ fechaVerificacion(ficha.verificadoEn) }}.</p>
          <ul class="fuentes-jugador">
            <li><a :href="ficha.fuenteOficialUrl" target="_blank" rel="noopener noreferrer">Fuente oficial del club <span aria-hidden="true">↗</span></a></li>
            <li v-for="fuente in ficha.fuentesAdicionales" :key="fuente.url"><a :href="fuente.url" target="_blank" rel="noopener noreferrer">{{ fuente.etiqueta }} <span aria-hidden="true">↗</span></a></li>
          </ul>
        </section>

        <section class="panel-jugador" aria-labelledby="titulo-partidos-club">
          <div class="encabezado-panel-jugador">
            <div><p class="etiqueta-seccion">AGENDA PÚBLICA</p><h2 id="titulo-partidos-club">Partidos de {{ ficha.club }}</h2></div>
            <a class="enlace-calendario-jugador" :href="ficha.calendarioOficialUrl" target="_blank" rel="noopener noreferrer">Calendario oficial <span aria-hidden="true">↗</span></a>
          </div>
          <ol v-if="partidosClubHoy.length" class="lista-partidos-jugador">
            <li v-for="partido in partidosClubHoy" :key="partido.id">
              <span class="estado-partido-jugador" :class="{ 'estado-en-vivo': partido.estado === 'en-vivo' }">{{ estadoPartido(partido) }}</span>
              <strong>{{ clubesPartido(partido) }}</strong>
              <span>{{ fechaPartido(partido) }}</span>
              <small>{{ partido.competencia }}</small>
            </li>
          </ol>
          <div v-else class="agenda-no-disponible-jugador">
            <p>La base pública de Pont3la10 conserva partidos del día, no calendarios europeos futuros. Para consultar el próximo encuentro y posibles cambios de horario, revisa la agenda oficial del club.</p>
            <a :href="ficha.calendarioOficialUrl" target="_blank" rel="noopener noreferrer">{{ ficha.calendarioOficialEtiqueta }} <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section class="panel-jugador" aria-labelledby="titulo-noticias-jugador">
          <div class="encabezado-panel-jugador">
            <div><p class="etiqueta-seccion">SEGUIMIENTO EDITORIAL</p><h2 id="titulo-noticias-jugador">Noticias de {{ ficha.nombre }}</h2></div>
            <NuxtLink :to="`/articulos?buscar=${encodeURIComponent(ficha.nombre)}`">Ver más noticias <span aria-hidden="true">→</span></NuxtLink>
          </div>
          <div v-if="noticiasRelacionadas.length" class="grilla-noticias-jugador">
            <article v-for="noticia in noticiasRelacionadas" :key="noticia.slug">
              <NuxtLink v-if="noticia.imagen" :to="`/articulos/${noticia.slug}`" class="imagen-noticia-jugador" tabindex="-1" aria-hidden="true"><img :src="noticia.imagen" :alt="noticia.titulo" loading="lazy"></NuxtLink>
              <p class="etiqueta-seccion">{{ noticia.categoria }}</p>
              <h3><NuxtLink :to="`/articulos/${noticia.slug}`">{{ noticia.titulo }}</NuxtLink></h3>
              <p>{{ noticia.resumen }}</p>
            </article>
          </div>
          <p v-else-if="!errorNoticias" class="estado-vacio-jugador">Aún no hay artículos publicados que mencionen a {{ ficha.nombre }}. La ficha no inventa actualidad cuando no hay cobertura editorial confirmada.</p>
          <p v-else class="estado-vacio-jugador">No fue posible cargar las noticias relacionadas. Puedes revisar la búsqueda editorial de {{ ficha.nombre }}.</p>
        </section>
      </div>

      <aside class="columna-jugador-secundaria">
        <section class="panel-jugador datos-rapidos-jugador" aria-labelledby="titulo-datos-jugador">
          <p class="etiqueta-seccion">DATOS DEL PERFIL</p>
          <h2 id="titulo-datos-jugador">Información verificada</h2>
          <dl>
            <div><dt>Nacionalidad</dt><dd>{{ ficha.nacionalidad }}</dd></div>
            <div><dt>Posición</dt><dd>{{ ficha.posicion }}</dd></div>
            <div><dt>Club</dt><dd>{{ ficha.club }}</dd></div>
            <div><dt>Competición</dt><dd>{{ ficha.competencia }}</dd></div>
          </dl>
        </section>
        <section class="panel-jugador enlaces-jugador">
          <p class="etiqueta-seccion">EXPLORAR</p>
          <NuxtLink to="/colombianos-en-europa">Más colombianos en Europa <span aria-hidden="true">→</span></NuxtLink>
          <NuxtLink to="/seleccion-colombia">Selección Colombia <span aria-hidden="true">→</span></NuxtLink>
          <NuxtLink to="/futbol-internacional">Fútbol internacional <span aria-hidden="true">→</span></NuxtLink>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.pagina-jugador-europa { --jugador-acento: #78dcf4; --jugador-texto: #edf3ff; --jugador-muted: #afc2db; }
.pagina-jugador-europa :is(h1, h2, h3) { color: #edf3ff; }
.pagina-jugador-europa .etiqueta-seccion { color: var(--jugador-acento); font-weight: 800; letter-spacing: .09em; }
.panel-jugador { border: 1px solid rgba(120, 220, 244, .22); border-radius: 20px; background: rgba(7, 24, 48, .78); padding: clamp(20px, 3vw, 30px); box-shadow: 0 18px 48px rgba(0, 0, 0, .12); }
.cabecera-jugador { display: flex; justify-content: space-between; align-items: center; gap: 32px; border-top: 3px solid #f1c744; margin: 22px 0; }
.jugador-identidad { display: flex; align-items: center; gap: 20px; }
.iniciales-club { display: grid; flex: 0 0 auto; width: 76px; height: 76px; place-items: center; border-radius: 50%; background: linear-gradient(145deg, #0d4770, #0b2548); border: 2px solid #78dcf4; color: #fff; font-weight: 900; font-size: 1.3rem; }
.cabecera-jugador h1 { margin: 4px 0; font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.08; }
.resumen-cabecera-jugador, .club-jugador p:last-child, .texto-descripcion-jugador, .fecha-verificacion-jugador { color: var(--jugador-muted); line-height: 1.7; }
.club-jugador { min-width: 220px; border-left: 1px solid rgba(255,255,255,.16); padding-left: 28px; }
.club-jugador h2 { margin: 6px 0; font-size: 1.25rem; }
.club-jugador a, .fuentes-jugador a, .enlace-calendario-jugador, .encabezado-panel-jugador > a, .enlaces-jugador a { color: #78dcf4; font-weight: 800; }
.contenido-jugador-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(250px, .72fr); gap: 22px; }
.columna-jugador-principal, .columna-jugador-secundaria { display: grid; align-content: start; gap: 22px; }
.panel-jugador h2 { margin: 4px 0 16px; font-size: clamp(1.25rem, 2vw, 1.65rem); }
.texto-descripcion-jugador { max-width: 850px; font-size: 1.03rem; }
.fuentes-jugador { display: flex; flex-wrap: wrap; gap: 12px 20px; padding: 0; margin: 16px 0 0; list-style: none; }
.encabezado-panel-jugador { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 14px; }
.encabezado-panel-jugador h2 { margin-bottom: 0; }
.agenda-no-disponible-jugador, .estado-vacio-jugador { color: var(--jugador-muted); line-height: 1.7; }
.agenda-no-disponible-jugador p { margin-top: 0; }
.agenda-no-disponible-jugador a { display: inline-flex; gap: 6px; color: #78dcf4; font-weight: 800; }
.lista-partidos-jugador { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.lista-partidos-jugador li { display: grid; gap: 6px; border: 1px solid rgba(255,255,255,.11); border-radius: 12px; padding: 14px; color: var(--jugador-muted); }
.lista-partidos-jugador strong { color: #edf3ff; font-size: 1.05rem; }
.lista-partidos-jugador small { color: #93a7c2; }
.estado-partido-jugador { width: fit-content; border-radius: 999px; padding: 3px 9px; background: rgba(120,220,244,.12); color: #78dcf4; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
.estado-en-vivo { background: rgba(242, 65, 87, .17); color: #ff7e90; }
.datos-rapidos-jugador dl { display: grid; gap: 0; margin: 0; }
.datos-rapidos-jugador dl div { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,.12); }
.datos-rapidos-jugador dt { color: #93a7c2; }
.datos-rapidos-jugador dd { margin: 0; color: #edf3ff; font-weight: 800; text-align: right; }
.enlaces-jugador { display: grid; gap: 12px; }
.enlaces-jugador p { margin-bottom: 0; }
.grilla-noticias-jugador { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.grilla-noticias-jugador article { overflow: hidden; border: 1px solid rgba(255,255,255,.11); border-radius: 14px; padding: 16px; }
.grilla-noticias-jugador h3 { line-height: 1.4; }
.grilla-noticias-jugador h3 a { color: inherit; }
.grilla-noticias-jugador article > p:last-child { color: var(--jugador-muted); line-height: 1.6; }
.imagen-noticia-jugador { display: block; aspect-ratio: 1.91; overflow: hidden; margin: -16px -16px 14px; }
.imagen-noticia-jugador img { width: 100%; height: 100%; object-fit: cover; }
body.tema-publico-blanco .pagina-jugador-europa { --jugador-acento: #145996; --jugador-muted: #586980; }
body.tema-publico-blanco .pagina-jugador-europa :is(h1, h2, h3) { color: #08204a; }
body.tema-publico-blanco .panel-jugador { background: #fff; border-color: #d9e3ef; box-shadow: 0 12px 36px rgba(8, 32, 74, .08); }
body.tema-publico-blanco .club-jugador a, body.tema-publico-blanco .fuentes-jugador a, body.tema-publico-blanco .enlace-calendario-jugador, body.tema-publico-blanco .encabezado-panel-jugador > a, body.tema-publico-blanco .enlaces-jugador a, body.tema-publico-blanco .agenda-no-disponible-jugador a { color: #145996; }
body.tema-publico-blanco .lista-partidos-jugador strong, body.tema-publico-blanco .datos-rapidos-jugador dd { color: #08204a; }
body.tema-publico-blanco .datos-rapidos-jugador dl div, body.tema-publico-blanco .lista-partidos-jugador li, body.tema-publico-blanco .grilla-noticias-jugador article { border-color: #e2e9f2; }
@media (max-width: 800px) { .contenido-jugador-grid { grid-template-columns: minmax(0, 1fr); } .cabecera-jugador { align-items: stretch; flex-direction: column; } .club-jugador { border-left: 0; border-top: 1px solid rgba(255,255,255,.16); padding: 18px 0 0; } }
@media (max-width: 560px) { .jugador-identidad { align-items: flex-start; gap: 12px; } .iniciales-club { width: 56px; height: 56px; font-size: 1rem; } .encabezado-panel-jugador { align-items: flex-start; flex-direction: column; } .grilla-noticias-jugador { grid-template-columns: minmax(0, 1fr); } }
</style>
