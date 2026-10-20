<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import type { PartidoResultado, RespuestaResultados } from '~/types/resultados'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import BotonSeguirJugador from '~/components/publico/BotonSeguirJugador.vue'
import { buscarPerfilJugadorEuropa, partidoCorrespondeAClubJugador } from '~/data/jugadoresColombianosEuropa'
import { historiasJugadoresEuropa, type VideoJugadorEuropa } from '~/data/historiasJugadoresEuropa'
import { resolverDestinoPromocionalReproductor } from '~/utils/publicidad/destinoPromocionalReproductor'
import { construirUrlAbsoluta } from '~/utils/seo'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'

const route = useRoute()
const configuracion = useRuntimeConfig()
const { publicidadAutorizada } = useAnaliticaPublica()
const slug = computed(() => String(route.params.slug || ''))
const perfil = computed(() => buscarPerfilJugadorEuropa(slug.value))

if (!perfil.value) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos una ficha pública para este jugador.' })
}

const ficha = perfil.value
const relato = historiasJugadoresEuropa[ficha.slug]
const videoPrevisualizado = ref<VideoJugadorEuropa | null>(null)
const avisoPublicidadVideo = ref('')
const anuncioVideoUrl = ref('')
const dialogoVideo = ref<HTMLElement | null>(null)
const activadorVideo = ref<HTMLButtonElement | null>(null)
const anunciosVideosAbiertosEnMemoria = new Set<string>()
const urlsPromocionalesVideo = computed(() => String(configuracion.public.adsterraMatchPromoUrls || '')
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
let overflowBodyAntes = ''

function abrirAnuncioAntesDeLaMiniatura(video: VideoJugadorEuropa): boolean {
  if (!import.meta.client || !publicidadAutorizada.value || !urlsPromocionalesVideo.value.length) return false

  const clave = `pont3la10:anuncio-video-jugador:v1:${ficha.slug}:${video.url}`
  if (anunciosVideosAbiertosEnMemoria.has(clave)) return false

  try {
    if (window.sessionStorage.getItem(clave) === '1') {
      anunciosVideosAbiertosEnMemoria.add(clave)
      return false
    }
  } catch {
    // El estado en memoria permite continuar si el navegador bloquea el almacenamiento.
  }

  const destino = resolverDestinoPromocionalReproductor(1, urlsPromocionalesVideo.value)
  if (!destino) return false

  anunciosVideosAbiertosEnMemoria.add(clave)
  try {
    window.sessionStorage.setItem(clave, '1')
  } catch {
    // El anuncio se conserva como paso previo durante esta vista del perfil.
  }
  const ventana = window.open(destino, '_blank', 'noopener,noreferrer')
  if (ventana) ventana.opener = null
  anuncioVideoUrl.value = destino
  avisoPublicidadVideo.value = `Se abrió un enlace patrocinado en otra pestaña. Vuelve y pulsa de nuevo “${video.titulo}” para ver la miniatura.`
  return true
}

async function abrirMiniatura(video: VideoJugadorEuropa, event: MouseEvent): Promise<void> {
  if (abrirAnuncioAntesDeLaMiniatura(video)) return
  avisoPublicidadVideo.value = ''
  anuncioVideoUrl.value = ''
  activadorVideo.value = event.currentTarget as HTMLButtonElement
  if (typeof document !== 'undefined') {
    overflowBodyAntes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  videoPrevisualizado.value = video
  await nextTick()
  dialogoVideo.value?.focus()
}

function cerrarMiniatura(): void {
  videoPrevisualizado.value = null
  if (typeof document !== 'undefined') document.body.style.overflow = overflowBodyAntes
  void nextTick(() => activadorVideo.value?.focus())
}

function manejarTeclasDialogo(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    cerrarMiniatura()
    return
  }
  if (event.key !== 'Tab') return

  const controles = dialogoVideo.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')
  if (!controles?.length) return
  const primero = controles[0]
  const ultimo = controles[controles.length - 1]
  if (event.shiftKey && (document.activeElement === primero || document.activeElement === dialogoVideo.value)) {
    event.preventDefault()
    ultimo.focus()
  } else if (!event.shiftKey && document.activeElement === ultimo) {
    event.preventDefault()
    primero.focus()
  }
}

onBeforeUnmount(() => {
  if (typeof document !== 'undefined' && videoPrevisualizado.value) document.body.style.overflow = overflowBodyAntes
})
const { data: respuestaNoticiasRelacionales, error: errorNoticiasRelacionales } = await useFetch<ResumenArticuloPublico[]>(
  `/api/articulos/entidad/player/${encodeURIComponent(ficha.slug)}`,
  {
    key: `articulos-relacionados-jugador-${ficha.slug}`,
    default: () => [],
    ignoreResponseError: true
  }
)
const { data: respuestaNoticiasPorNombre, error: errorNoticiasPorNombre } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos',
  {
    key: `articulos-por-nombre-jugador-${ficha.slug}`,
    query: { buscar: ficha.nombre, limite: 50 },
    default: () => [],
    ignoreResponseError: true
  }
)

function normalizarNombreBusqueda(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
}

const noticiasRelacionadas = computed(() => {
  const nombreNormalizado = normalizarNombreBusqueda(ficha.nombre)
  const coincidenciasPorNombre = (Array.isArray(respuestaNoticiasPorNombre.value) ? respuestaNoticiasPorNombre.value : [])
    .filter((noticia) => normalizarNombreBusqueda(`${noticia.titulo} ${noticia.resumen}`).includes(nombreNormalizado))
  const noticiasUnicas = new Map<string, ResumenArticuloPublico>()
  for (const noticia of [
    ...(Array.isArray(respuestaNoticiasRelacionales.value) ? respuestaNoticiasRelacionales.value : []),
    ...coincidenciasPorNombre
  ]) {
    noticiasUnicas.set(noticia.id || noticia.slug, noticia)
  }
  return [...noticiasUnicas.values()]
    .sort((primero, segundo) => Date.parse(segundo.publicadoEn) - Date.parse(primero.publicadoEn))
    .slice(0, 6)
})
const errorNoticiasCarga = computed(() => Boolean(errorNoticiasRelacionales.value && errorNoticiasPorNombre.value))

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
  descripcion: `${ficha.nombre}: trayectoria, momentos clave, videos y actualidad del club. Fuentes enlazadas en su perfil.`,
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
    <nav class="migas-jugador" aria-label="Migas de pan">
      <NuxtLink to="/">Inicio</NuxtLink><span aria-hidden="true">/</span>
      <NuxtLink to="/colombianos-en-europa">Colombianos en Europa</NuxtLink><span aria-hidden="true">/</span>
      <span aria-current="page">{{ ficha.nombre }}</span>
    </nav>

    <header class="portada-jugador">
      <div class="trama-portada" aria-hidden="true" />
      <div class="retrato-portada">
        <img :src="ficha.imagenPerfil" :alt="`Retrato ilustrado de ${ficha.nombre}`" width="260" height="260" fetchpriority="high" decoding="async">
        <span>Retrato ilustrado</span>
      </div>
      <div class="texto-portada">
        <p class="sobrelinea-jugador"><span class="punto-sobrelinea" /> Especial · Colombianos en Europa</p>
        <h1>{{ ficha.nombre }}</h1>
        <p class="bajada-portada">Una carrera que se sigue jugando: sus inicios, los clubes que lo formaron y los momentos que lo hicieron crecer.</p>
        <div class="datos-portada" aria-label="Datos principales">
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>{{ ficha.posicion }}</span>
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 3v4m8-4v4M4 9h16"/></svg>{{ ficha.competencia }}</span>
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM8 7V4h8v3m-8 5h8"/></svg>{{ ficha.nacionalidad }}</span>
        </div>
        <BotonSeguirJugador :slug="ficha.slug" :nombre="ficha.nombre" />
      </div>
      <a class="escudo-club-portada" :href="ficha.urlClub" target="_blank" rel="noopener noreferrer">
        <span class="etiqueta-lateral">HOY EN</span>
        <strong>{{ ficha.club }}</strong>
        <span>{{ ficha.paisCompetencia }} <span aria-hidden="true">↗</span></span>
      </a>
      <span class="numero-portada" aria-hidden="true">10</span>
    </header>

    <div class="reportaje-jugador">
      <div class="columna-reportaje">
        <section class="bloque-historia" aria-labelledby="titulo-historia-jugador">
          <div class="titulo-seccion-jugador">
            <span class="icono-seccion" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h7"/></svg></span>
            <div><p class="ceja-jugador">EL CAMINO</p><h2 id="titulo-historia-jugador">Una historia en movimiento</h2></div>
          </div>
          <p class="entradilla-historia">{{ relato.historia }}</p>
        </section>

        <section class="bloque-trayectoria" aria-labelledby="titulo-trayectoria-jugador">
          <div class="titulo-seccion-jugador">
            <span class="icono-seccion icono-amarillo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 7h14M5 17h14"/><circle cx="12" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/></svg></span>
            <div><p class="ceja-jugador">CLUB A CLUB</p><h2 id="titulo-trayectoria-jugador">Su trayectoria</h2></div>
          </div>
          <ol class="linea-tiempo-jugador">
            <li v-for="etapa in relato.trayectoria" :key="`${etapa.periodo}-${etapa.club}`">
              <span class="punto-tiempo" aria-hidden="true" />
              <div class="fila-tiempo"><span class="periodo-tiempo">{{ etapa.periodo }}</span><h3>{{ etapa.club }}</h3></div>
              <p>{{ etapa.detalle }}</p>
            </li>
          </ol>
        </section>

        <section class="bloque-videos" aria-labelledby="titulo-videos-jugador">
          <div class="titulo-seccion-jugador titulo-con-enlace">
            <div class="titulo-agrupado"><span class="icono-seccion icono-rojo" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/></svg></span><div><p class="ceja-jugador">MIRA LA JUGADA</p><h2 id="titulo-videos-jugador">Momentos en video</h2></div></div>
            <span class="salida-externa">YouTube ↗</span>
          </div>
          <div class="grilla-videos-jugador">
            <button v-for="(video, indice) in relato.videos" :key="video.url" class="tarjeta-video-jugador" type="button" :aria-label="`Ver miniatura de ${video.titulo}`" @click="abrirMiniatura(video, $event)">
              <span class="marco-video-jugador" :class="`marco-video-${indice + 1}`">
                <img :src="video.miniaturaUrl" :alt="`Miniatura del video: ${video.titulo}`" loading="lazy" decoding="async" width="640" height="360">
                <span class="etiqueta-video">VISTA PREVIA</span>
                <span class="boton-play-video" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6z"/></svg></span>
                <span class="sr-only">Pulsa para ver la miniatura antes de abrir el video</span>
                <span class="cancha-video" aria-hidden="true" />
              </span>
              <span class="texto-video-jugador"><strong>{{ video.titulo }}</strong><span>{{ video.canal }} · Abrir vista previa</span></span>
            </button>
          </div>
          <p v-if="avisoPublicidadVideo" class="aviso-anuncio-video" role="status" aria-live="polite">{{ avisoPublicidadVideo }} <a :href="anuncioVideoUrl" target="_blank" rel="sponsored nofollow noopener noreferrer" referrerpolicy="no-referrer">Reabrir anuncio</a>.</p>
          <p class="nota-videos-jugador">Con publicidad permitida, el primer clic abre un enlace patrocinado en otra pestaña; vuelve y pulsa el mismo video para ver la miniatura. Después puedes abrir el original en YouTube.</p>
        </section>

        <section class="bloque-noticias-jugador" aria-labelledby="titulo-noticias-jugador">
          <div class="titulo-seccion-jugador titulo-con-enlace">
            <div class="titulo-agrupado"><span class="icono-seccion icono-azul" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5"/></svg></span><div><p class="ceja-jugador">SEGUIMIENTO EDITORIAL</p><h2 id="titulo-noticias-jugador">Lo último de {{ ficha.nombre }}</h2></div></div>
            <NuxtLink class="enlace-mas-jugador" :to="`/articulos?buscar=${encodeURIComponent(ficha.nombre)}`">Más noticias <span aria-hidden="true">→</span></NuxtLink>
          </div>
          <div v-if="noticiasRelacionadas.length" class="grilla-noticias-jugador">
            <article v-for="noticia in noticiasRelacionadas" :key="noticia.slug" class="tarjeta-noticia-jugador">
              <NuxtLink v-if="noticia.imagen" :to="`/articulos/${noticia.slug}`" class="imagen-noticia-jugador" tabindex="-1" aria-hidden="true">
                <ImagenEditorialPublica :src="noticia.imagen" :alt="noticia.titulo" width="640" height="360" :ancho-original="noticia.imagenAncho" sizes="(max-width: 760px) 100vw, 640px" />
              </NuxtLink>
              <p class="categoria-noticia-jugador">{{ noticia.categoria }}</p>
              <h3><NuxtLink :to="`/articulos/${noticia.slug}`">{{ noticia.titulo }}</NuxtLink></h3>
              <p>{{ noticia.resumen }}</p>
            </article>
          </div>
          <p v-else-if="!errorNoticiasCarga" class="vacio-noticias-jugador">Aún no hay artículos vinculados editorialmente con {{ ficha.nombre }}. Aquí aparecerán cuando exista cobertura confirmada.</p>
          <p v-else class="vacio-noticias-jugador">No fue posible cargar las noticias relacionadas. <NuxtLink :to="`/articulos?buscar=${encodeURIComponent(ficha.nombre)}`">Busca su cobertura editorial.</NuxtLink></p>
        </section>

        <section class="bloque-fuentes-jugador" aria-labelledby="titulo-fuentes-jugador">
          <div class="titulo-seccion-jugador titulo-seccion-compacta">
            <span class="icono-seccion icono-azul" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"/></svg></span>
            <div><p class="ceja-jugador">PARA SEGUIR LEYENDO</p><h2 id="titulo-fuentes-jugador">Fuentes y referencias</h2></div>
          </div>
          <ul class="fuentes-jugador">
            <li v-for="fuente in relato.fuentes" :key="fuente.url"><a :href="fuente.url" target="_blank" rel="noopener noreferrer">{{ fuente.etiqueta }} <span aria-hidden="true">↗</span></a></li>
            <li><a :href="ficha.fuenteOficialUrl" target="_blank" rel="noopener noreferrer">Ficha oficial del club actual <span aria-hidden="true">↗</span></a></li>
            <li><a :href="ficha.fuenteImagenUrl" target="_blank" rel="noopener noreferrer">Foto de referencia del retrato <span aria-hidden="true">↗</span></a></li>
            <li v-if="ficha.autorImagen && ficha.licenciaImagenUrl">Imagen base: {{ ficha.autorImagen }}; retrato adaptado con IA · <a :href="ficha.licenciaImagenUrl" target="_blank" rel="noopener noreferrer">licencia CC BY 4.0 <span aria-hidden="true">↗</span></a></li>
            <li v-for="fuente in ficha.fuentesAdicionales" :key="fuente.url"><a :href="fuente.url" target="_blank" rel="noopener noreferrer">{{ fuente.etiqueta }} <span aria-hidden="true">↗</span></a></li>
          </ul>
          <p class="fecha-verificacion-jugador">Club y datos del perfil contrastados el {{ fechaVerificacion(ficha.verificadoEn) }}.</p>
        </section>

        <PublicidadAdsterraSlot formato="nativo" contexto="colombianos en Europa · ficha de futbolista" />
      </div>

      <aside class="columna-lateral-jugador" aria-label="Datos y actualidad del jugador">
        <section class="destacado-lateral-jugador" aria-labelledby="titulo-hito-jugador">
          <span class="icono-hito-jugador" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></span>
          <p class="ceja-jugador">EL DATO PARA RECORDAR</p>
          <h2 id="titulo-hito-jugador">{{ relato.etiquetaHito }}</h2>
          <p>{{ relato.hito }}</p>
          <span class="marca-destacado" aria-hidden="true">P10</span>
        </section>

        <section class="panel-lateral-jugador ficha-actual-jugador" aria-labelledby="titulo-actualidad-jugador">
          <div class="titulo-lateral-jugador"><span class="icono-lateral-jugador" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM8 7V4h8v3m-8 5h8"/></svg></span><div><p class="ceja-jugador">TEMPORADA 2026/27</p><h2 id="titulo-actualidad-jugador">Su equipo actual</h2></div></div>
          <a class="nombre-club-lateral" :href="ficha.urlClub" target="_blank" rel="noopener noreferrer">{{ ficha.club }} <span aria-hidden="true">↗</span></a>
          <p class="meta-club-lateral">{{ ficha.competencia }} · {{ ficha.paisCompetencia }}</p>
          <dl class="datos-club-jugador">
            <div><dt><span aria-hidden="true">◎</span> Posición</dt><dd>{{ ficha.posicion }}</dd></div>
            <div><dt><span aria-hidden="true">⌖</span> País</dt><dd>{{ ficha.paisCompetencia }}</dd></div>
            <div><dt><span aria-hidden="true">◷</span> Verificado</dt><dd>{{ fechaVerificacion(ficha.verificadoEn) }}</dd></div>
          </dl>
        </section>

        <section class="panel-lateral-jugador agenda-lateral-jugador" aria-labelledby="titulo-partidos-club">
          <div class="titulo-lateral-jugador"><span class="icono-lateral-jugador icono-amarillo" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></span><div><p class="ceja-jugador">PRÓXIMO ENCUENTRO</p><h2 id="titulo-partidos-club">Agenda</h2></div></div>
          <ol v-if="partidosClubHoy.length" class="lista-partidos-jugador">
            <li v-for="partido in partidosClubHoy" :key="partido.id">
              <span class="estado-partido-jugador" :class="{ 'estado-en-vivo': partido.estado === 'en-vivo' }">{{ estadoPartido(partido) }}</span>
              <strong>{{ clubesPartido(partido) }}</strong>
              <span>{{ fechaPartido(partido) }}</span><small>{{ partido.competencia }}</small>
            </li>
          </ol>
          <div v-else class="agenda-no-disponible-jugador"><p>Los próximos horarios europeos pueden cambiar y no están en la base diaria de resultados.</p></div>
          <a class="boton-calendario-jugador" :href="ficha.calendarioOficialUrl" target="_blank" rel="noopener noreferrer">{{ ficha.calendarioOficialEtiqueta }} <span aria-hidden="true">↗</span></a>
        </section>

        <section class="panel-lateral-jugador explora-jugador" aria-label="Explorar más fútbol">
          <p class="ceja-jugador">SIGUE EL FÚTBOL</p>
          <NuxtLink to="/colombianos-en-europa">Más colombianos en Europa <span aria-hidden="true">→</span></NuxtLink>
          <NuxtLink to="/seleccion-colombia">Selección Colombia <span aria-hidden="true">→</span></NuxtLink>
          <NuxtLink to="/futbol-internacional">Fútbol internacional <span aria-hidden="true">→</span></NuxtLink>
        </section>
      </aside>
    </div>

    <Teleport to="body">
      <div v-if="videoPrevisualizado" ref="dialogoVideo" class="capa-previsualizacion-video" role="dialog" aria-modal="true" aria-labelledby="titulo-preview-video" aria-describedby="descripcion-preview-video" tabindex="-1" @click.self="cerrarMiniatura" @keydown="manejarTeclasDialogo">
        <section class="ventana-previsualizacion-video">
          <button class="cerrar-preview-video" type="button" aria-label="Cerrar vista previa" @click="cerrarMiniatura"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
          <div class="imagen-preview-video">
            <img :src="videoPrevisualizado.miniaturaUrl" :alt="`Miniatura del video: ${videoPrevisualizado.titulo}`" width="1280" height="720" fetchpriority="high">
            <span class="insignia-preview-video">MINIATURA DEL VIDEO</span>
            <span class="play-preview-video" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6z" /></svg></span>
          </div>
          <div class="contenido-preview-video">
            <p class="ceja-jugador">SEGUNDO PASO · VIDEO ORIGINAL</p>
            <h2 id="titulo-preview-video">{{ videoPrevisualizado.titulo }}</h2>
            <p id="descripcion-preview-video">La miniatura es una vista previa. Al pulsar el botón, el video se abrirá en una pestaña nueva de YouTube.</p>
            <div class="acciones-preview-video">
              <button type="button" class="boton-volver-preview" @click="cerrarMiniatura">Volver al perfil</button>
              <a :href="videoPrevisualizado.url" target="_blank" rel="noopener noreferrer" class="boton-original-preview">Abrir video original en YouTube <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.pagina-jugador-europa { --jugador-acento: #8de6f6; --jugador-texto: #f4f7fb; --jugador-muted: #bdcadd; --jugador-linea: rgba(255,255,255,.12); --jugador-panel: #10243c; --jugador-titulo: #f4f7fb; width: min(1260px, 100% - 36px); padding-top: 18px; padding-bottom: 70px; color: var(--jugador-texto); }
.pagina-jugador-europa :is(h1, h2, h3, p) { color: inherit; }
.migas-jugador { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin: 0 0 18px; color: var(--jugador-muted); font-size: .84rem; }
.migas-jugador a { color: inherit; text-decoration: none; }
.migas-jugador a:hover, .migas-jugador a:focus-visible { color: var(--jugador-acento); }
.portada-jugador { position: relative; isolation: isolate; display: grid; grid-template-columns: 220px minmax(0, 1fr) minmax(170px, 220px); align-items: center; gap: clamp(22px, 4vw, 48px); overflow: hidden; min-height: 340px; padding: clamp(26px, 4vw, 48px); border: 1px solid rgba(130,220,244,.24); border-top: 4px solid #f1c744; border-radius: 24px; background: radial-gradient(ellipse at 75% 20%, rgba(11, 98, 131, .46), transparent 46%), linear-gradient(116deg, #071a31 0%, #0b2842 64%, #12374e 100%); box-shadow: 0 22px 64px rgba(0,0,0,.22); }
.trama-portada { position: absolute; z-index: -1; inset: 0; opacity: .26; background-image: linear-gradient(33deg, transparent 48%, rgba(255,255,255,.14) 49%, transparent 50%), radial-gradient(circle at 84% 50%, transparent 0 86px, rgba(255,255,255,.24) 87px 88px, transparent 89px); background-size: 34px 34px, auto; mask-image: linear-gradient(90deg, transparent, #000 70%); }
.retrato-portada { position: relative; justify-self: center; width: clamp(170px, 20vw, 220px); aspect-ratio: 1; padding: 7px; border: 1px solid rgba(141,230,246,.74); border-radius: 50%; background: linear-gradient(155deg, rgba(141,230,246,.18), rgba(241,199,68,.3)); box-shadow: 0 20px 54px rgba(0,0,0,.3); }
.retrato-portada::before { position: absolute; inset: -12px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; content: ''; }
.retrato-portada img { display: block; width: 100%; height: 100%; border-radius: 50%; background: #143653; object-fit: cover; object-position: center 27%; }
.retrato-portada > span { position: absolute; right: -10px; bottom: 14px; border: 1px solid rgba(255,255,255,.2); border-radius: 999px; padding: 7px 10px; background: #092139; color: #dbeaf5; font-size: .68rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.texto-portada { position: relative; z-index: 1; min-width: 0; }
.sobrelinea-jugador, .etiqueta-lateral, .ceja-jugador { margin: 0; color: var(--jugador-acento); font-size: .71rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.sobrelinea-jugador { display: flex; align-items: center; gap: 9px; }
.punto-sobrelinea { width: 7px; height: 7px; border-radius: 50%; background: #f1c744; box-shadow: 0 0 0 4px rgba(241,199,68,.13); }
.texto-portada h1 { margin: 12px 0 8px; color: #fff; font-size: clamp(2.35rem, 5.3vw, 4.5rem); letter-spacing: -.055em; line-height: .98; }
.bajada-portada { max-width: 610px; margin: 0; color: #d4e0ea; font-size: 1.03rem; line-height: 1.68; }
.datos-portada { display: flex; flex-wrap: wrap; gap: 9px 18px; margin: 20px 0 16px; }
.datos-portada span { display: inline-flex; align-items: center; gap: 7px; color: #e7f0f7; font-size: .88rem; font-weight: 750; }
.datos-portada svg, .icono-seccion svg, .icono-hito-jugador svg, .icono-lateral-jugador svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.escudo-club-portada { position: relative; z-index: 1; display: grid; justify-items: start; gap: 8px; align-content: center; min-height: 120px; border-left: 1px solid rgba(255,255,255,.22); padding: 12px 0 12px 24px; color: #fff; text-decoration: none; }
.escudo-club-portada strong { font-size: 1.16rem; line-height: 1.35; }
.escudo-club-portada > span:last-child { color: #bfd0df; font-size: .86rem; }
.escudo-club-portada:hover strong, .escudo-club-portada:focus-visible strong { color: var(--jugador-acento); }
.numero-portada { position: absolute; right: 15%; bottom: -95px; z-index: -1; color: rgba(255,255,255,.035); font-size: 26rem; font-weight: 950; line-height: .8; pointer-events: none; }
.reportaje-jugador { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(290px, .78fr); align-items: start; gap: 24px; margin-top: 24px; }
.columna-reportaje, .columna-lateral-jugador { display: grid; align-content: start; gap: 22px; min-width: 0; }
.bloque-historia, .bloque-trayectoria, .bloque-videos, .bloque-noticias-jugador, .bloque-fuentes-jugador, .panel-lateral-jugador { border: 1px solid var(--jugador-linea); border-radius: 18px; background: var(--jugador-panel); box-shadow: 0 12px 38px rgba(0,0,0,.12); }
.bloque-historia, .bloque-trayectoria, .bloque-videos, .bloque-noticias-jugador, .bloque-fuentes-jugador, .panel-lateral-jugador { padding: clamp(20px, 3vw, 30px); }
.titulo-seccion-jugador, .titulo-agrupado, .titulo-lateral-jugador { display: flex; align-items: center; gap: 13px; }
.icono-seccion, .icono-lateral-jugador { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border: 1px solid rgba(141,230,246,.28); border-radius: 13px; background: rgba(141,230,246,.1); color: var(--jugador-acento); }
.icono-seccion svg { width: 21px; height: 21px; }
.icono-amarillo { color: #f1c744; background: rgba(241,199,68,.1); border-color: rgba(241,199,68,.25); }
.icono-rojo { color: #ff858a; background: rgba(255,103,108,.1); border-color: rgba(255,103,108,.23); }
.icono-azul { color: #83b9ff; background: rgba(89,145,255,.1); border-color: rgba(89,145,255,.24); }
.titulo-seccion-jugador h2, .titulo-lateral-jugador h2 { margin: 4px 0 0; color: var(--jugador-titulo); font-size: clamp(1.24rem, 2vw, 1.62rem); letter-spacing: -.035em; line-height: 1.2; }
.ceja-jugador { color: var(--jugador-muted); font-size: .66rem; }
.entradilla-historia { max-width: 780px; margin: 22px 0 0; color: var(--jugador-texto); font-size: clamp(1rem, 1.4vw, 1.12rem); line-height: 1.85; }
.bloque-trayectoria { position: relative; overflow: hidden; }
.linea-tiempo-jugador { position: relative; display: grid; gap: 0; margin: 22px 0 0 5px; padding: 0 0 0 23px; list-style: none; }
.linea-tiempo-jugador::before { position: absolute; top: 8px; bottom: 15px; left: 5px; width: 1px; background: linear-gradient(var(--jugador-acento), rgba(141,230,246,.12)); content: ''; }
.linea-tiempo-jugador li { position: relative; padding: 0 0 21px 8px; }
.punto-tiempo { position: absolute; top: 5px; left: -23px; width: 11px; height: 11px; border: 2px solid #10243c; border-radius: 50%; background: #f1c744; box-shadow: 0 0 0 2px #f1c744; }
.fila-tiempo { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.periodo-tiempo { color: var(--jugador-acento); font-size: .76rem; font-weight: 850; letter-spacing: .02em; }
.fila-tiempo h3 { margin: 0; color: var(--jugador-titulo); font-size: 1rem; }
.linea-tiempo-jugador li p { margin: 5px 0 0; color: var(--jugador-muted); font-size: .91rem; line-height: 1.6; }
.titulo-con-enlace { justify-content: space-between; gap: 16px; }
.salida-externa { color: var(--jugador-muted); font-size: .78rem; font-weight: 750; }
.grilla-videos-jugador { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 20px; }
.tarjeta-video-jugador { display: block; width: 100%; overflow: hidden; border: 1px solid var(--jugador-linea); border-radius: 15px; padding: 0; background: rgba(1,12,26,.28); color: var(--jugador-texto); font: inherit; text-align: left; cursor: pointer; transition: transform .18s ease, border-color .18s ease; }
.tarjeta-video-jugador:hover { transform: translateY(-3px); border-color: rgba(141,230,246,.55); }
.tarjeta-video-jugador:focus-visible { outline: 3px solid #f1c744; outline-offset: 3px; }
.marco-video-jugador { position: relative; display: grid; aspect-ratio: 16 / 8.4; place-items: center; overflow: hidden; background: radial-gradient(circle at 73% 50%, rgba(241,199,68,.32), transparent 19%), linear-gradient(125deg, #071a31, #0e4862); }
.marco-video-2 { background: radial-gradient(circle at 26% 30%, rgba(255,116,117,.25), transparent 28%), linear-gradient(125deg, #17152e, #0a3347); }
.marco-video-jugador img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.marco-video-jugador::after { position: absolute; inset: auto 0 0; height: 30%; background: linear-gradient(transparent, rgba(0,0,0,.35)); content: ''; }
.etiqueta-video { position: absolute; top: 10px; left: 11px; z-index: 1; border: 1px solid rgba(255,255,255,.2); border-radius: 999px; padding: 5px 7px; background: rgba(5,18,31,.62); color: #fff; font-size: .58rem; font-weight: 900; letter-spacing: .08em; }
.boton-play-video { position: relative; z-index: 1; display: grid; width: 48px; height: 48px; place-items: center; border: 1px solid rgba(255,255,255,.7); border-radius: 50%; background: rgba(255,255,255,.13); color: #fff; backdrop-filter: blur(8px); transition: background .18s ease, transform .18s ease; }
.boton-play-video svg { width: 22px; height: 22px; fill: currentColor; }
.tarjeta-video-jugador:hover .boton-play-video { transform: scale(1.08); background: rgba(216,50,57,.9); }
.cancha-video { position: absolute; right: -25px; bottom: -75px; width: 180px; height: 150px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; }
.texto-video-jugador { display: grid; gap: 7px; padding: 13px 14px 15px; }
.texto-video-jugador strong { color: var(--jugador-titulo); font-size: .88rem; line-height: 1.45; }
.texto-video-jugador > span { color: var(--jugador-muted); font-size: .73rem; }
.nota-videos-jugador { margin: 12px 0 0; color: var(--jugador-muted); font-size: .78rem; }
.aviso-anuncio-video { margin: 14px 0 0; border-left: 3px solid #f1c744; padding: 10px 12px; background: rgba(241,199,68,.09); color: var(--jugador-titulo); font-size: .83rem; line-height: 1.55; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; clip-path: inset(50%); }
.capa-previsualizacion-video { position: fixed; z-index: 10000; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 22px; background: rgba(2,10,20,.82); backdrop-filter: blur(9px); }
.ventana-previsualizacion-video { position: relative; width: min(860px, 100%); overflow: hidden; border: 1px solid rgba(141,230,246,.3); border-radius: 20px; background: #0b1e32; color: #f4f7fb; box-shadow: 0 28px 90px rgba(0,0,0,.55); }
.cerrar-preview-video { position: absolute; z-index: 3; top: 12px; right: 12px; display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid rgba(255,255,255,.32); border-radius: 50%; background: rgba(3,15,28,.78); color: #fff; cursor: pointer; }
.cerrar-preview-video svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }
.imagen-preview-video { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: #10243c; }
.imagen-preview-video::after { position: absolute; inset: 45% 0 0; background: linear-gradient(transparent, rgba(0,0,0,.34)); content: ''; }
.imagen-preview-video img { display: block; width: 100%; height: 100%; object-fit: cover; }
.insignia-preview-video { position: absolute; z-index: 1; top: 15px; left: 16px; border: 1px solid rgba(255,255,255,.3); border-radius: 999px; padding: 7px 10px; background: rgba(4,16,29,.72); color: #fff; font-size: .65rem; font-weight: 900; letter-spacing: .1em; }
.play-preview-video { position: absolute; z-index: 1; top: 50%; left: 50%; display: grid; width: 66px; height: 66px; place-items: center; transform: translate(-50%,-50%); border: 1px solid rgba(255,255,255,.75); border-radius: 50%; background: rgba(216,50,57,.9); color: #fff; }
.play-preview-video svg { width: 30px; height: 30px; fill: currentColor; }
.contenido-preview-video { padding: clamp(20px,4vw,32px); }
.contenido-preview-video .ceja-jugador { color: #8de6f6; }
.contenido-preview-video h2 { margin: 7px 52px 8px 0; color: #f4f7fb; font-size: clamp(1.25rem,3vw,1.8rem); line-height: 1.25; }
.contenido-preview-video > p:not(.ceja-jugador) { max-width: 640px; margin: 0; color: #bdcadd; font-size: .9rem; line-height: 1.65; }
.acciones-preview-video { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-top: 22px; }
.boton-volver-preview, .boton-original-preview { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; padding: 10px 14px; font: inherit; font-size: .83rem; font-weight: 850; text-decoration: none; cursor: pointer; }
.boton-volver-preview { border: 1px solid rgba(255,255,255,.22); background: transparent; color: #e6edf4; }
.boton-original-preview { border: 1px solid #f1c744; background: #f1c744; color: #10223a; }
.cerrar-preview-video:focus-visible, .boton-volver-preview:focus-visible, .boton-original-preview:focus-visible { outline: 3px solid #8de6f6; outline-offset: 3px; }
.enlace-mas-jugador { color: var(--jugador-acento); font-size: .83rem; font-weight: 850; text-decoration: none; white-space: nowrap; }
.grilla-noticias-jugador { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; margin-top: 20px; }
.tarjeta-noticia-jugador { overflow: hidden; border: 1px solid var(--jugador-linea); border-radius: 14px; padding: 14px; background: rgba(1,12,26,.19); }
.imagen-noticia-jugador { display: block; aspect-ratio: 16 / 8; overflow: hidden; margin: -14px -14px 13px; background: rgba(141,230,246,.08); }
.imagen-noticia-jugador img { width: 100%; height: 100%; object-fit: cover; transition: transform .25s ease; }
.tarjeta-noticia-jugador:hover .imagen-noticia-jugador img { transform: scale(1.03); }
.categoria-noticia-jugador { margin: 0; color: var(--jugador-acento); font-size: .65rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.tarjeta-noticia-jugador h3 { margin: 8px 0; color: var(--jugador-titulo); font-size: 1rem; line-height: 1.4; }
.tarjeta-noticia-jugador h3 a { color: inherit; text-decoration: none; }
.tarjeta-noticia-jugador > p:last-child, .vacio-noticias-jugador { color: var(--jugador-muted); font-size: .88rem; line-height: 1.65; }
.vacio-noticias-jugador { margin: 18px 0 0; }
.vacio-noticias-jugador a { color: var(--jugador-acento); }
.bloque-fuentes-jugador { border-style: dashed; box-shadow: none; }
.titulo-seccion-compacta .icono-seccion { flex-basis: 36px; width: 36px; height: 36px; border-radius: 11px; }
.titulo-seccion-compacta .icono-seccion svg { width: 18px; height: 18px; }
.titulo-seccion-compacta h2 { font-size: 1.15rem; }
.fuentes-jugador { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; margin: 18px 0 0; padding: 0; list-style: none; }
.fuentes-jugador li { color: var(--jugador-muted); font-size: .8rem; line-height: 1.55; }
.fuentes-jugador a { color: var(--jugador-acento); font-weight: 750; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.fecha-verificacion-jugador { margin: 16px 0 0; color: var(--jugador-muted); font-size: .75rem; }
.destacado-lateral-jugador { position: relative; overflow: hidden; border-radius: 18px; padding: 25px; background: linear-gradient(145deg, #164e68, #0c293e 72%); box-shadow: 0 16px 38px rgba(0,0,0,.2); }
.icono-hito-jugador { display: grid; width: 44px; height: 44px; margin-bottom: 22px; place-items: center; border: 1px solid rgba(241,199,68,.4); border-radius: 14px; background: rgba(241,199,68,.13); color: #f1c744; }
.icono-hito-jugador svg { width: 24px; height: 24px; fill: rgba(241,199,68,.2); }
.destacado-lateral-jugador h2 { position: relative; z-index: 1; margin: 7px 0 10px; color: #fff; font-size: 1.38rem; line-height: 1.2; }
.destacado-lateral-jugador > p:last-of-type { position: relative; z-index: 1; margin: 0; color: #e4edf2; font-size: .92rem; line-height: 1.7; }
.marca-destacado { position: absolute; right: 10px; bottom: -17px; color: rgba(255,255,255,.06); font-size: 6rem; font-style: italic; font-weight: 950; }
.titulo-lateral-jugador { align-items: center; }
.titulo-lateral-jugador .ceja-jugador { font-size: .61rem; }
.titulo-lateral-jugador h2 { font-size: 1.14rem; }
.nombre-club-lateral { display: block; margin-top: 21px; color: var(--jugador-titulo); font-size: 1.25rem; font-weight: 900; line-height: 1.3; text-decoration: none; }
.nombre-club-lateral span { color: var(--jugador-acento); font-size: .85rem; }
.meta-club-lateral { margin: 5px 0 0; color: var(--jugador-muted); font-size: .82rem; }
.datos-club-jugador { display: grid; gap: 0; margin: 18px 0 0; }
.datos-club-jugador div { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid var(--jugador-linea); padding: 11px 0; }
.datos-club-jugador dt { color: var(--jugador-muted); font-size: .8rem; }
.datos-club-jugador dt span { display: inline-block; width: 18px; color: var(--jugador-acento); font-size: .95rem; }
.datos-club-jugador dd { margin: 0; color: var(--jugador-titulo); font-size: .8rem; font-weight: 800; text-align: right; }
.agenda-no-disponible-jugador { margin: 18px 0; }
.agenda-no-disponible-jugador p { margin: 0; color: var(--jugador-muted); font-size: .85rem; line-height: 1.65; }
.lista-partidos-jugador { display: grid; gap: 10px; margin: 18px 0; padding: 0; list-style: none; }
.lista-partidos-jugador li { display: grid; gap: 6px; border: 1px solid var(--jugador-linea); border-radius: 12px; padding: 13px; color: var(--jugador-muted); font-size: .8rem; }
.lista-partidos-jugador strong { color: var(--jugador-titulo); font-size: .95rem; }
.lista-partidos-jugador small { color: var(--jugador-muted); }
.estado-partido-jugador { width: fit-content; border-radius: 999px; padding: 3px 8px; background: rgba(141,230,246,.12); color: var(--jugador-acento); font-size: .68rem; font-weight: 900; text-transform: uppercase; }
.estado-en-vivo { background: rgba(242,65,87,.18); color: #ff8b99; }
.boton-calendario-jugador { display: flex; justify-content: space-between; gap: 12px; border: 1px solid rgba(141,230,246,.28); border-radius: 11px; padding: 11px 12px; color: var(--jugador-acento); font-size: .78rem; font-weight: 850; line-height: 1.4; text-decoration: none; }
.boton-calendario-jugador:hover { background: rgba(141,230,246,.08); }
.explora-jugador { display: grid; gap: 0; }
.explora-jugador > .ceja-jugador { margin-bottom: 10px; }
.explora-jugador a { display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid var(--jugador-linea); padding: 12px 0; color: var(--jugador-texto); font-size: .86rem; font-weight: 800; text-decoration: none; }
.explora-jugador a span { color: var(--jugador-acento); }
.pagina-jugador-europa a:focus-visible { outline: 3px solid #f1c744; outline-offset: 3px; }
body.tema-publico-blanco .pagina-jugador-europa { --jugador-acento: #11648f; --jugador-texto: #24364b; --jugador-muted: #617187; --jugador-linea: #dce5ef; --jugador-panel: #fff; --jugador-titulo: #08264a; }
body.tema-publico-blanco .portada-jugador { border-color: #c8dbea; border-top-color: #e0b52f; background: radial-gradient(ellipse at 78% 20%, rgba(107,207,222,.3), transparent 45%), linear-gradient(116deg, #e9f2f7, #dceaf1 64%, #d2e7ec); }
body.tema-publico-blanco .texto-portada h1 { color: #08264a; }
body.tema-publico-blanco .bajada-portada, body.tema-publico-blanco .datos-portada span { color: #3d556c; }
body.tema-publico-blanco .escudo-club-portada { border-color: rgba(8,38,74,.2); color: #08264a; }
body.tema-publico-blanco .escudo-club-portada > span:last-child { color: #586e82; }
body.tema-publico-blanco .retrato-portada > span { border-color: #cedce7; background: #fff; color: #204461; }
body.tema-publico-blanco .bloque-historia, body.tema-publico-blanco .bloque-trayectoria, body.tema-publico-blanco .bloque-videos, body.tema-publico-blanco .bloque-noticias-jugador, body.tema-publico-blanco .bloque-fuentes-jugador, body.tema-publico-blanco .panel-lateral-jugador { box-shadow: 0 12px 34px rgba(8,32,74,.07); }
body.tema-publico-blanco .destacado-lateral-jugador { background: linear-gradient(145deg, #176486, #0e3a58 72%); }
body.tema-publico-blanco .marco-video-jugador { background-color: #10243c; }
body.tema-publico-blanco .tarjeta-video-jugador, body.tema-publico-blanco .tarjeta-noticia-jugador { background: #f7f9fc; }
body.tema-publico-blanco .punto-tiempo { border-color: #fff; }
@media (max-width: 940px) {
  .portada-jugador { grid-template-columns: 175px minmax(0,1fr); }
  .retrato-portada { width: 165px; }
  .escudo-club-portada { grid-column: 2; min-height: 0; border-top: 1px solid rgba(255,255,255,.2); border-left: 0; padding: 15px 0 0; }
  .reportaje-jugador { grid-template-columns: minmax(0,1.35fr) minmax(260px,.8fr); }
}
@media (max-width: 760px) {
  .reportaje-jugador { grid-template-columns: minmax(0,1fr); }
  .columna-lateral-jugador { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .destacado-lateral-jugador, .agenda-lateral-jugador { grid-row: span 2; }
}
@media (max-width: 560px) {
  .pagina-jugador-europa { width: min(100% - 22px, 1260px); padding-top: 10px; }
  .portada-jugador { grid-template-columns: minmax(0,1fr); gap: 21px; padding: 25px 21px; border-radius: 18px; }
  .retrato-portada { justify-self: start; width: 142px; }
  .texto-portada h1 { font-size: clamp(2.25rem, 11vw, 3.3rem); }
  .escudo-club-portada { grid-column: 1; width: 100%; }
  .numero-portada { right: -8px; bottom: -45px; font-size: 17rem; }
  .grilla-videos-jugador, .grilla-noticias-jugador, .fuentes-jugador { grid-template-columns: minmax(0,1fr); }
  .columna-lateral-jugador { grid-template-columns: minmax(0,1fr); }
  .destacado-lateral-jugador, .agenda-lateral-jugador { grid-row: auto; }
  .titulo-con-enlace { align-items: flex-start; }
  .salida-externa { display: none; }
  .capa-previsualizacion-video { padding: 10px; }
  .ventana-previsualizacion-video { border-radius: 15px; }
  .acciones-preview-video { flex-direction: column-reverse; }
  .boton-volver-preview, .boton-original-preview { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .tarjeta-video-jugador, .boton-play-video, .imagen-noticia-jugador img { transition: none; }
  .tarjeta-video-jugador:hover, .tarjeta-video-jugador:hover .boton-play-video { transform: none; }
}
</style>
