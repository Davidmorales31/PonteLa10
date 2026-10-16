<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { resolverDestinoPromocionalReproductor } from '~/utils/publicidad/destinoPromocionalReproductor'
import type { ProgramacionTransmisionPublica } from '~/utils/partidos/programacion'
import { etiquetasDistribucionProgramacion } from '~/utils/partidos/programacion'
import type { NavegacionContextualPartidoSeo } from '~/types/navegacionContextualSeo'
import type { EvaluacionFrescuraDeportiva } from '~/utils/frescuraDatosDeportivos'
import { construirUrlAbsoluta } from '~/utils/seo'
import BarraCompartirArticulo from '~/components/editorial/BarraCompartirArticulo.vue'

interface PartidoSeoVista {
  slug: string
  competencia: string
  temporada: string
  jornada: string | null
  fechaIso: string
  local: string
  visitante: string
  estado: string | null
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  fuenteOficialUrl: string | null
  escudoLocal: string | null
  escudoVisitante: string | null
  equipoLocalSlug?: string
  equipoVisitanteSlug?: string
  verificadoEn: string
  estadoFrescura?: EvaluacionFrescuraDeportiva
  transmisiones?: ProgramacionTransmisionPublica[]
}

const props = defineProps<{
  modo: 'donde-ver' | 'como-quedo' | 'partido'
  partido: PartidoSeoVista
  noticias: ResumenArticuloPublico[]
  navegacion?: NavegacionContextualPartidoSeo | null
}>()
const { modo, noticias, navegacion } = toRefs(props)
const partido = shallowRef(props.partido)
watch(() => props.partido, (nuevoPartido) => {
  partido.value = nuevoPartido
  posterVideoUrl.value = `/api/partidos-seo/${encodeURIComponent(nuevoPartido.slug)}/imagen?formato=wide`
  cargarPosterVideo()
})

const configuracion = useRuntimeConfig()
const tituloCompartir = computed(() => `${partido.value.local} vs ${partido.value.visitante} | ${nombreCompetencia.value}`)
const urlCompartir = computed(() => construirUrlAbsoluta(
  String(configuracion.public.siteUrl),
  `/partidos/${encodeURIComponent(partido.value.slug)}`
))
const textoCompartir = computed(() => {
  const partes = [
    `${partido.value.local} vs ${partido.value.visitante}`,
    nombreCompetencia.value,
    fechaPartido(partido.value.fechaIso)
  ]
  if (estadoPartido.value === 'FINALIZADO' && marcadorDisponible.value) {
    partes.unshift(`Resultado final: ${marcador.value}`)
  }
  return partes.join(' · ')
})
const { registrarEvento, publicidadAutorizada } = useAnaliticaPublica()
const escudosFallidos = ref<string[]>([])
const urlsPromocionales = computed(() => String(configuracion.public.adsterraMatchPromoUrls || '')
  .split(',')
  .map(valor => {
    try {
      const url = new URL(valor.trim())
      return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
    } catch {
      return ''
    }
  })
  .filter(Boolean))
const cartelPartidoUrl = computed(() => `/api/partidos-seo/${encodeURIComponent(partido.value.slug)}/imagen?formato=wide`)
const posterVideoUrl = ref(cartelPartidoUrl.value)
let clicsReproductorEnMemoria = 0
let primerAnuncioWinPlayEnMemoria = false
const urlWinPlay = 'https://winplay.co/'
const competenciasWinSports = ['liga-betplay', 'torneo-betplay', 'copa-colombia']
const marcadorDisponible = computed(() => partido.value.golesLocal !== null
  && partido.value.golesVisitante !== null)
const marcador = computed(() => `${partido.value.golesLocal ?? '—'}–${partido.value.golesVisitante ?? '—'}`)
const estadoPartido = computed(() => etiquetaEstadoSeoPartido(partido.value.estado))
const transmisionesConfirmadas = computed(() => (partido.value.transmisiones || [])
  .filter(transmision => transmision.status === 'confirmed'
    && Boolean(transmision.verifiedAt)
    && transmision.sourceUrl.startsWith('https://')))
const mostrarEnlaceWinSports = computed(() => competenciasWinSports.includes(partido.value.competencia))
const textoMarcador = computed(() => {
  if (!marcadorDisponible.value) return 'El marcador oficial todavía no está publicado.'
  if (estadoPartido.value === 'EN VIVO') return `Marcador actualizado: ${marcador.value}`
  if (estadoPartido.value === 'FINALIZADO') return `Resultado registrado: ${marcador.value}`
  return `Marcador registrado: ${marcador.value}`
})
const nombreCompetencia = computed(() => {
  if (partido.value.competencia === 'torneo-betplay') return 'Torneo BetPlay'
  if (partido.value.competencia === 'copa-colombia') return 'Copa Colombia'
  return 'Liga BetPlay'
})
const etiquetaPartido = computed(() => modoEstadoParaEtiqueta(estadoPartido.value, props.modo === 'como-quedo' ? 'como-quedo' : 'donde-ver'))

function fechaPartido(valor: string, incluirHora = true) {
  if (!Number.isFinite(Date.parse(valor))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    ...(incluirHora ? { timeStyle: 'short' as const } : {}),
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('es-CO')
}

function nombrePais(codigo: string) {
  return new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) || codigo
}

function fechaVerificacion(valor: string) {
  const fecha = new Date(valor)
  if (!Number.isFinite(fecha.getTime())) return 'Fecha de verificación no disponible'
  const fechaHora = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(fecha)
  return `Verificada el ${fechaHora} (hora de Colombia)`
}

function modoEstadoParaEtiqueta(estado: string, modo: 'donde-ver' | 'como-quedo') {
  if (estado === 'EN VIVO') return estado
  if (estado === 'FINALIZADO') return estado
  if (['REPROGRAMADO', 'APLAZADO', 'SUSPENDIDO', 'CANCELADO', 'ABANDONADO'].includes(estado)) return estado
  if (estado === 'ACTUALIZACIÓN PENDIENTE') return estado
  return modo === 'donde-ver' ? 'PRÓXIMO PARTIDO' : 'AÚN NO INICIA'
}

function mostrarEscudo(url: string | null) {
  return Boolean(url && !escudosFallidos.value.includes(url))
}

function escudoFallido(url: string | null) {
  if (url && !escudosFallidos.value.includes(url)) escudosFallidos.value = [...escudosFallidos.value, url]
}

function gestionarClicReproductor() {
  if (!import.meta.client || !publicidadAutorizada.value || !urlsPromocionales.value.length) return

  const clave = 'pont3la10:clics-reproductor-partido:v1'
  let clics = 0
  try {
    const guardados = Number.parseInt(window.sessionStorage.getItem(clave) || '0', 10)
    clics = Math.max(clicsReproductorEnMemoria, Number.isSafeInteger(guardados) && guardados >= 0 ? guardados : 0) + 1
    window.sessionStorage.setItem(clave, String(clics))
  } catch {
    // Si el navegador bloquea el almacenamiento, el clic explícito conserva su destino.
    clics = ++clicsReproductorEnMemoria
  }
  clicsReproductorEnMemoria = Math.max(clicsReproductorEnMemoria, clics)
  const destino = resolverDestinoPromocionalReproductor(clics, urlsPromocionales.value)
  if (!destino) return
  const ventana = window.open(destino, '_blank', 'noopener,noreferrer')
  if (ventana) ventana.opener = null
}

function gestionarClicWinPlay(evento: MouseEvent) {
  if (!import.meta.client || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
  evento.preventDefault()
  void registrarEvento('channel_click')

  if (publicidadAutorizada.value && urlsPromocionales.value.length) {
    const clave = 'pont3la10:anuncio-winplay-visto:v1'
    let mostrarAnuncio = false
    try {
      mostrarAnuncio = window.sessionStorage.getItem(clave) !== '1'
      if (mostrarAnuncio) window.sessionStorage.setItem(clave, '1')
    } catch {
      mostrarAnuncio = !primerAnuncioWinPlayEnMemoria
      primerAnuncioWinPlayEnMemoria = true
    }

    if (mostrarAnuncio) {
      window.open(urlsPromocionales.value[0], '_blank', 'noopener,noreferrer')
    }
  }

  window.location.assign(urlWinPlay)
}

function cargarPosterVideo() {
  if (!import.meta.client || props.modo === 'como-quedo') return
  const slug = partido.value.slug
  const fechaIso = partido.value.fechaIso
  const mesBogota = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit'
  }).format(new Date(partido.value.fechaIso))
  const posterMensual = `/partidos/${mesBogota}/${slug}.webp`
  const imagenPoster = new Image()
  imagenPoster.onload = () => {
    if (partido.value.slug === slug && partido.value.fechaIso === fechaIso) posterVideoUrl.value = posterMensual
  }
  imagenPoster.onerror = () => {
    if (partido.value.slug === slug && partido.value.fechaIso === fechaIso) posterVideoUrl.value = cartelPartidoUrl.value
  }
  imagenPoster.src = posterMensual
}

onMounted(() => {
  void registrarEvento(props.modo === 'como-quedo' ? 'result_page_view' : 'match_page_view')
  cargarPosterVideo()
})
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio pagina-partido-seo">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><NuxtLink to="/liga-colombiana">Liga colombiana</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">{{ modo === 'partido' ? `${partido.local} vs ${partido.visitante}` : `${modo === 'donde-ver' ? 'Dónde ver' : 'Cómo quedó'} ${partido.local} vs ${partido.visitante}` }}</span></li>
      </ol>
    </nav>

    <div class="contenido-partido-seo-grid">
      <div class="columna-principal-partido">
        <header class="encabezado-partido-seo">
          <p class="etiqueta-seccion">{{ nombreCompetencia }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></p>
          <h1 v-if="modo === 'partido'">{{ partido.local }} vs {{ partido.visitante }}: fecha, hora y resultado</h1>
          <h1 v-else-if="modo === 'donde-ver'">¿Dónde ver {{ partido.local }} vs {{ partido.visitante }}?</h1>
          <h1 v-else>Cómo quedó {{ partido.local }} vs {{ partido.visitante }}</h1>
          <p v-if="modo === 'partido'">Horario de Colombia, estado y marcador en una sola ficha, con fuente y hora de consulta cuando están disponibles. La programación de transmisión solo se muestra cuando tiene confirmación oficial.</p>
          <p v-else-if="modo === 'donde-ver'">Horario de Colombia, estadio y canales oficiales disponibles para el partido.</p>
          <p v-else>Consulta el estado del encuentro y el marcador publicado para {{ partido.local }} y {{ partido.visitante }}.</p>
          <BarraCompartirArticulo
            v-if="modo === 'partido'"
            :titulo="tituloCompartir"
            :texto="textoCompartir"
            :url="urlCompartir"
            etiqueta="la ficha del partido"
          />
        </header>

        <section class="cartel-partido-seo" :class="{ 'cartel-resultado': modo === 'como-quedo' }" aria-label="Datos del partido">
          <video
            v-if="modo !== 'como-quedo'"
            class="reproductor-partido-seo"
            :poster="posterVideoUrl"
            controls
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            :aria-label="`Vista previa promocional de ${partido.local} vs ${partido.visitante}; no es una transmisión en vivo`"
            @click="gestionarClicReproductor"
          >
            <source src="/videos/liga-betplay-fondo-16x9.mp4" type="video/mp4">
            Tu navegador no puede reproducir esta vista previa. Consulta los datos del partido a continuación.
          </video>
          <img
            v-else
            class="cartel-imagen-resultado"
            :src="cartelPartidoUrl"
            :alt="`Cartel del resultado: ${partido.local} ${marcadorDisponible ? marcador : 'vs'} ${partido.visitante}, ${etiquetaPartido}`"
            width="1200"
            height="675"
            sizes="(max-width: 760px) 100vw, 940px"
            fetchpriority="high"
            decoding="async"
          >
          <div v-if="modo !== 'como-quedo'" class="capa-datos-reproductor" aria-hidden="true">
            <div class="marca-cartel-partido"><span>Pont3la10</span><span class="competencia-cartel-partido">{{ nombreCompetencia }}</span></div>
            <span class="estado-cartel-partido" :class="{ 'estado-en-vivo': estadoPartido === 'EN VIVO' }">{{ etiquetaPartido }}</span>
            <div class="equipos-cartel-partido">
              <div class="equipo-cartel-partido">
                <EscudoEquipoPublico v-if="mostrarEscudo(partido.escudoLocal)" :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" :width="142" :height="142" sizes="(max-width: 500px) 68px, 142px" loading="eager" @error="escudoFallido(partido.escudoLocal)" />
                <span v-else class="escudo-cartel-fallback">{{ iniciales(partido.local) }}</span>
                <strong>{{ partido.local }}</strong>
                <small>LOCAL</small>
              </div>
              <div class="centro-cartel-partido">
                <b>{{ marcadorDisponible ? marcador : 'VS' }}</b>
                <span>{{ fechaPartido(partido.fechaIso) }}</span>
              </div>
              <div class="equipo-cartel-partido">
                <EscudoEquipoPublico v-if="mostrarEscudo(partido.escudoVisitante)" :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" :width="142" :height="142" sizes="(max-width: 500px) 68px, 142px" loading="eager" @error="escudoFallido(partido.escudoVisitante)" />
                <span v-else class="escudo-cartel-fallback">{{ iniciales(partido.visitante) }}</span>
                <strong>{{ partido.visitante }}</strong>
                <small>VISITANTE</small>
              </div>
            </div>
            <p class="nota-previa-promocional">Vista previa promocional · no es una transmisión en vivo</p>
          </div>
          <p class="detalles-cartel-partido">
            <span>{{ fechaPartido(partido.fechaIso) }}</span>
            <span v-if="partido.estadio">{{ partido.estadio }}</span>
            <span v-if="partido.ciudad">{{ partido.ciudad }}</span>
          </p>
        </section>

        <nav class="tabs-partido-seo" aria-label="Secciones de la ficha">
          <a href="#resumen">Resumen</a>
          <a href="#informacion">Información</a>
          <a href="#noticias">Noticias</a>
        </nav>

        <article class="articulo-partido-seo">
          <section id="resumen" class="bloque-datos-partido-seo marcador-partido-resumen" :class="{ 'marcador-partido-resumen--vivo': estadoPartido === 'EN VIVO' }" aria-labelledby="titulo-resumen-partido">
            <header class="cabecera-marcador-resumen">
              <div><span class="rotulo-marcador-resumen">{{ nombreCompetencia }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></span><h2 id="titulo-resumen-partido">{{ marcadorDisponible && estadoPartido === 'FINALIZADO' ? 'Resultado final' : 'Marcador y estado' }}</h2></div>
              <span class="insignia-estado-marcador" :class="`insignia-estado-marcador--${estadoPartido === 'EN VIVO' ? 'vivo' : estadoPartido === 'FINALIZADO' ? 'final' : 'proximo'}`" role="status" aria-live="polite"><i aria-hidden="true" />{{ estadoPartido }}</span>
            </header>
            <div class="pizarra-marcador-partido">
              <div class="equipo-resumen-marcador">
                <EscudoEquipoPublico v-if="mostrarEscudo(partido.escudoLocal)" :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" :width="56" :height="56" sizes="56px" loading="lazy" @error="escudoFallido(partido.escudoLocal)" />
                <span v-else class="escudo-resumen-fallback">{{ iniciales(partido.local) }}</span>
                <div><small>LOCAL</small><strong>{{ partido.local }}</strong></div>
              </div>
              <div class="centro-marcador-resumen">
                <div v-if="marcadorDisponible" class="cifras-marcador-resumen"><strong>{{ partido.golesLocal }}</strong><span>–</span><strong>{{ partido.golesVisitante }}</strong></div>
                <strong v-else class="versus-marcador-resumen">VS</strong>
                <small>{{ estadoPartido === 'FINALIZADO' ? 'MARCADOR FINAL' : estadoPartido === 'EN VIVO' ? 'EN JUEGO' : 'PARTIDO' }}</small>
              </div>
              <div class="equipo-resumen-marcador equipo-resumen-marcador--visitante">
                <EscudoEquipoPublico v-if="mostrarEscudo(partido.escudoVisitante)" :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" :width="56" :height="56" sizes="56px" loading="lazy" @error="escudoFallido(partido.escudoVisitante)" />
                <span v-else class="escudo-resumen-fallback">{{ iniciales(partido.visitante) }}</span>
                <div><small>VISITANTE</small><strong>{{ partido.visitante }}</strong></div>
              </div>
            </div>
            <div class="detalle-eventos-partido">
              <span aria-hidden="true">i</span>
              <div><strong>{{ estadoPartido === 'FINALIZADO' ? 'Sin eventos publicados' : 'Detalle del encuentro' }}</strong><p>{{ estadoPartido === 'FINALIZADO' ? 'Los goleadores y demás eventos no están disponibles en una fuente verificada.' : textoMarcador }}</p></div>
            </div>
          </section>

          <section v-if="modo !== 'como-quedo'" class="preguntas-partido-seo" aria-labelledby="faq-partido-seo">
            <h2 id="faq-partido-seo">Preguntas frecuentes</h2>
            <details open><summary>¿A qué hora juega {{ partido.local }} vs {{ partido.visitante }}?</summary><p>El horario publicado es {{ fechaPartido(partido.fechaIso) }}, hora de Colombia. Si la organización anuncia un cambio, esta ficha se actualizará.</p></details>
            <details><summary>¿Dónde ver {{ partido.local }} vs {{ partido.visitante }}?</summary><p v-if="transmisionesConfirmadas.length">{{ transmisionesConfirmadas.map(item => `${item.channel} (${nombrePais(item.countryCode)})`).join(', ') }}. Revisa la fuente enlazada junto a cada opción porque la disponibilidad puede variar según el país.</p><p v-else-if="mostrarEnlaceWinSports">La Liga BetPlay, el Torneo BetPlay y la Copa Colombia cuentan con señal de Win Sports+. Usa el botón «Ver en vivo» para abrir Win Play y consultar la disponibilidad.</p><p v-else>El canal o la plataforma para este partido todavía no está confirmado.</p></details>
          </section>
          <section v-else class="contexto-partido-seo">
            <h2>Información del partido</h2>
            <p>{{ nombreCompetencia }} {{ partido.temporada }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template>. Los goleadores, las alineaciones y el resumen se mostrarán solo cuando estén presentes en una fuente publicada y verificada.</p>
          </section>

          <nav class="enlaces-mutua-partido" aria-label="Más información del encuentro">
            <NuxtLink v-if="navegacion?.equipoLocal" :to="navegacion.equipoLocal.ruta">Equipo local: {{ navegacion.equipoLocal.nombre }} <span aria-hidden="true">→</span></NuxtLink>
            <NuxtLink v-if="navegacion?.equipoVisitante" :to="navegacion.equipoVisitante.ruta">Equipo visitante: {{ navegacion.equipoVisitante.nombre }} <span aria-hidden="true">→</span></NuxtLink>
            <NuxtLink v-if="navegacion?.competencia" :to="navegacion.competencia.ruta">Competición: {{ navegacion.competencia.nombre }} <span aria-hidden="true">→</span></NuxtLink>
            <NuxtLink v-if="navegacion?.siguientePartido" :to="navegacion.siguientePartido.ruta">Siguiente partido: {{ navegacion.siguientePartido.nombre }} <span aria-hidden="true">→</span></NuxtLink>
            <NuxtLink v-if="navegacion?.resultadoAnterior" :to="navegacion.resultadoAnterior.ruta">Resultado anterior: {{ navegacion.resultadoAnterior.nombre }} <span aria-hidden="true">→</span></NuxtLink>
            <NuxtLink
              v-if="modo !== 'partido'"
              :to="`/partidos/${partido.slug}`"
              @click="registrarEvento('internal_match_link_click')"
            >Ficha completa del partido <span aria-hidden="true">→</span></NuxtLink>
            <NuxtLink v-if="!navegacion?.competencia" to="/liga-colombiana">Liga colombiana <span aria-hidden="true">→</span></NuxtLink>
          </nav>
          <PublicidadAdsterraSlot formato="leaderboard" contexto="página SEO de partido" />
        </article>
      </div>

      <aside class="lateral-partido-seo" aria-label="Información complementaria del partido">
        <PublicidadAdsterraSlot formato="nativo" contexto="noticias relacionadas con partido" />
        <section id="informacion" class="bloque-datos-partido-seo tarjeta-informacion-partido" aria-labelledby="titulo-informacion-partido">
          <header class="encabezado-informacion-partido">
            <span>DATOS DEL ENCUENTRO</span>
            <h2 id="titulo-informacion-partido">Horario y dónde ver</h2>
            <p>{{ partido.local }} vs {{ partido.visitante }}</p>
          </header>
          <dl class="lista-informacion-partido">
            <div class="dato-informacion-partido">
              <span class="icono-informacion-partido" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9h17M8 13h3M8 16.5h7" /></svg></span>
              <div><dt>Fecha y hora</dt><dd>{{ fechaPartido(partido.fechaIso) }}<small>Hora de Colombia</small></dd></div>
            </div>
            <div class="dato-informacion-partido">
              <span class="icono-informacion-partido" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4h10l2 4-2 12H7L5 8l2-4Z" /><path d="M5.5 8h13M9 4 7.5 8M15 4l1.5 4M9 12h6M9 15h6" /></svg></span>
              <div><dt>Competición</dt><dd>{{ nombreCompetencia }} · {{ partido.temporada }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></dd></div>
            </div>
            <div class="dato-informacion-partido">
              <span class="icono-informacion-partido" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m8 3 4 2 4-2M8 21l4-2 4 2M10 10l5 2-5 2v-4Z" /></svg></span>
              <div>
                <dt>Canal o plataforma</dt>
                <dd v-if="transmisionesConfirmadas.length">
                  <ul class="lista-transmisiones-partido">
                    <li v-for="transmision in transmisionesConfirmadas" :key="transmision.id">
                      <strong>{{ transmision.channel }}</strong> · {{ transmision.platform }}
                      <span> · {{ nombrePais(transmision.countryCode) }} · {{ etiquetasDistribucionProgramacion[transmision.distributionType] }}</span>
                      <a :href="transmision.sourceUrl" target="_blank" rel="noopener noreferrer">Ver fuente</a>
                      <small>{{ fechaVerificacion(transmision.verifiedAt || '') }}</small>
                      <span v-if="transmision.notes">{{ transmision.notes }}</span>
                    </li>
                  </ul>
                </dd>
                <dd v-else-if="mostrarEnlaceWinSports">Win Sports+<small>Acceso y disponibilidad en Win Play</small></dd>
                <dd v-else>Por confirmar. No hay una fuente verificada para este partido.</dd>
              </div>
            </div>
            <div class="dato-informacion-partido">
              <span class="icono-informacion-partido" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V9l7-5 7 5v11M8 20v-6h8v6M9 10h.01M15 10h.01" /></svg></span>
              <div><dt>Estadio</dt><dd>{{ partido.estadio || 'No publicado' }}<template v-if="partido.ciudad"> · {{ partido.ciudad }}</template></dd></div>
            </div>
          </dl>
          <a
            v-if="mostrarEnlaceWinSports"
            class="boton-win-sports"
            :href="urlWinPlay"
            aria-label="Ver en vivo en Win Sports+, plataforma Win Play"
            @click="gestionarClicWinPlay"
          ><img src="/images/win-sports-ver-en-vivo.svg" alt="Ver en vivo en Win Sports+" width="600" height="180" loading="lazy" decoding="async"></a>
          <p v-if="mostrarEnlaceWinSports" class="nota-win-sports">La disponibilidad depende de la programación y del acceso a Win Play.</p>
          <p v-if="mostrarEnlaceWinSports && publicidadAutorizada && urlsPromocionales.length" class="nota-anuncio-win-play">El primer clic de esta sesión abre un anuncio patrocinado en otra pestaña.</p>
          <p v-if="!mostrarEnlaceWinSports" class="nota-info-transmision">La programación de transmisión solo aparece cuando existe una fuente verificada.</p>
        </section>
        <section id="noticias" class="panel-noticias-lateral noticias-relacionadas-partido" aria-labelledby="titulo-noticias-partido">
          <div class="encabezado-panel-lateral"><h2 id="titulo-noticias-partido">Noticias relacionadas</h2><NuxtLink to="/liga-colombiana">Ver todas <span aria-hidden="true">→</span></NuxtLink></div>
          <ol v-if="noticias.length">
            <li v-for="articulo in noticias" :key="articulo.slug"><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink><p>{{ articulo.categoria }}</p></li>
          </ol>
          <p v-else>Las noticias relacionadas aparecerán cuando haya publicaciones editoriales disponibles.</p>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.pagina-partido-seo { padding-bottom: 56px; color: #e8f2fd; color-scheme: dark; }
.encabezado-partido-seo { max-width: 940px; margin-bottom: 22px; }
.encabezado-partido-seo h1 { margin: 8px 0; color: #f5f8ff; font-size: clamp(1.8rem, 4vw, 3rem); }
.encabezado-partido-seo > p:last-child { color: #afc2db; line-height: 1.6; }
.encabezado-partido-seo :deep(.barra-compartir-articulo) { max-width: 100%; margin: 14px 0 0; border-color: #294362; }
.encabezado-partido-seo :deep(.barra-compartir-articulo strong) { color: #d3e0ef; }
.encabezado-partido-seo :deep(.barra-compartir-articulo button) { border-color: #315273; background: #10243d; color: #e8f2ff; }
.encabezado-partido-seo :deep(.barra-compartir-articulo button:hover), .encabezado-partido-seo :deep(.barra-compartir-articulo button:focus-visible) { border-color: #59d9ff; background: #17476b; color: #fff; }
.cartel-partido-seo { position: relative; display: grid; overflow: hidden; align-content: start; justify-items: center; gap: 18px; border: 1px solid #28708b; border-radius: 18px; background: #061b35; padding: 18px; }
.reproductor-partido-seo { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; background: #061b35; object-fit: cover; }
.cartel-imagen-resultado { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; background: #061b35; object-fit: cover; }
.capa-datos-reproductor { position: absolute; inset: 18px 18px auto; display: grid; min-height: 16vw; align-content: center; justify-items: center; gap: 12px; border-radius: 12px; background: linear-gradient(115deg, rgba(3,17,37,.75), rgba(3,17,37,.48) 52%, rgba(3,17,37,.72)); pointer-events: none; }
.nota-previa-promocional { margin: 0; color: #d3e0ef; font-size: .85rem; text-align: center; }
.nota-clic-promocional { margin: 0; color: #9fb5ce; font-size: .8rem; line-height: 1.5; text-align: center; }
.marca-cartel-partido { display: flex; width: 100%; align-items: center; justify-content: space-between; color: #fff; font-size: 1.4rem; font-weight: 900; }
.competencia-cartel-partido { border-radius: 999px; background: #0c3c60; color: #7ce8ff; padding: 8px 14px; font-size: .82rem; }
.estado-cartel-partido { border-radius: 999px; background: #103756; color: #91eaff; padding: 7px 13px; font-size: .76rem; font-weight: 900; letter-spacing: .08em; }
.estado-en-vivo { background: #b31931; color: #fff; }
.equipos-cartel-partido { display: grid; width: min(900px, 100%); align-items: center; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: clamp(12px, 4vw, 52px); }
.equipo-cartel-partido { display: grid; justify-items: center; gap: 12px; color: #fff; text-align: center; }
.equipo-cartel-partido img, .escudo-cartel-fallback { display: grid; width: clamp(82px, 11vw, 142px); height: clamp(82px, 11vw, 142px); place-items: center; border: 6px solid #52d9ff; border-radius: 50%; background: #12446b; object-fit: contain; padding: 15px; }
.escudo-cartel-fallback { color: white; font-size: 2rem; font-weight: 900; }
.equipo-cartel-partido strong { font-size: clamp(.96rem, 1.9vw, 1.45rem); }
.equipo-cartel-partido small { color: #c3d4e8; font-weight: 800; }
.centro-cartel-partido { display: grid; justify-items: center; gap: 12px; color: #fff; text-align: center; }
.centro-cartel-partido b { color: #ffd342; font-size: clamp(2.4rem, 7vw, 5rem); }
.centro-cartel-partido span { max-width: 360px; color: #d4e1ef; line-height: 1.5; }
.detalles-cartel-partido { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 14px; color: #d3e0ef; text-align: center; }
.detalles-cartel-partido span + span::before { content: '•'; margin-right: 14px; }
.boton-win-sports { display: block; width: 100%; overflow: hidden; border-radius: 12px; text-decoration: none; transition: filter .18s ease, transform .18s ease; }
.boton-win-sports:hover { transform: translateY(-2px); filter: brightness(1.05); }
.boton-win-sports:focus-visible { outline: 3px solid #ff9b52; outline-offset: 3px; }
.boton-win-sports img { display: block; width: 100%; height: auto; border-radius: inherit; }
.nota-win-sports, .nota-info-transmision { margin: 9px 1px 0; color: #a9bfd5; font-size: .76rem; line-height: 1.45; }
.nota-anuncio-win-play { margin: 7px 1px 0; color: #93abc2; font-size: .69rem; line-height: 1.4; }
.contenido-partido-seo-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(270px, .8fr); gap: 24px; margin-top: 28px; }
.columna-principal-partido { display: grid; align-content: start; gap: 20px; min-width: 0; }
.articulo-partido-seo, .lateral-partido-seo { display: grid; align-content: start; gap: 20px; min-width: 0; }
.encabezado-partido-seo { max-width: none; margin: 0; }
.tabs-partido-seo { display: flex; min-width: 0; overflow-x: auto; border: 1px solid #294362; border-radius: 10px; background: #10243d; scrollbar-width: thin; }
.tabs-partido-seo a { display: inline-flex; min-height: 46px; flex: 0 0 auto; align-items: center; border-bottom: 2px solid transparent; padding: 0 18px; color: #b4c7dd; font-weight: 750; text-decoration: none; }
.tabs-partido-seo a:first-child { border-color: #83dff6; color: #83dff6; }
.tabs-partido-seo a:hover, .tabs-partido-seo a:focus-visible { color: #fff; outline: 2px solid #59d9ff; outline-offset: -3px; }
.bloque-datos-partido-seo, .preguntas-partido-seo, .contexto-partido-seo, .noticias-relacionadas-partido { border: 1px solid #294362; border-radius: 12px; background: #10243d; padding: 20px; }
.bloque-datos-partido-seo h2, .preguntas-partido-seo h2, .contexto-partido-seo h2 { color: #f5f8ff; }
.bloque-datos-partido-seo h2, .preguntas-partido-seo h2, .contexto-partido-seo h2 { margin-top: 0; }
.bloque-datos-partido-seo dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bloque-datos-partido-seo dl div { border-radius: 8px; background: rgba(4, 18, 36, .45); padding: 12px; }
.bloque-datos-partido-seo dt { color: #83dff6; font-size: .8rem; font-weight: 900; }
.bloque-datos-partido-seo dd { margin: 5px 0 0; line-height: 1.5; }
.bloque-datos-partido-seo dd small { display: block; margin-top: 4px; }
.encabezado-informacion-partido { margin: 0 0 15px; }
.encabezado-informacion-partido > span { color: #f29b5b; font-size: .65rem; font-weight: 900; letter-spacing: .12em; }
.encabezado-informacion-partido h2 { margin: 4px 0 0; font-size: 1.3rem; line-height: 1.2; }
.encabezado-informacion-partido p { margin: 4px 0 0; color: #a9bfd5; font-size: .86rem; line-height: 1.4; }
.bloque-datos-partido-seo dl.lista-informacion-partido { grid-template-columns: minmax(0, 1fr); gap: 9px; margin: 0 0 15px; }
.bloque-datos-partido-seo dl.lista-informacion-partido .dato-informacion-partido { display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 11px; border: 1px solid rgba(148, 175, 200, .12); border-radius: 10px; background: rgba(4, 18, 36, .45); padding: 10px; }
.icono-informacion-partido { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 9px; background: rgba(131, 223, 246, .1); color: #83dff6; }
.icono-informacion-partido svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.dato-informacion-partido dt { color: #a9bfd5; font-size: .69rem; font-weight: 850; letter-spacing: .045em; text-transform: uppercase; }
.dato-informacion-partido dd { margin: 3px 0 0; font-size: .87rem; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.dato-informacion-partido dd small { margin-top: 3px; color: #93abc2; font-size: .73rem; font-weight: 500; }
.lista-transmisiones-partido { display: grid; gap: 8px; margin: 0; padding-left: 18px; }
.lista-transmisiones-partido li { padding-left: 2px; }
.lista-transmisiones-partido a { display: inline-block; margin-left: 7px; color: #83dff6; font-weight: 850; }
.lista-transmisiones-partido small { display: block; margin-top: 3px; color: #a9bdd4; font-size: .7rem; }
.bloque-datos-partido-seo > p, .contexto-partido-seo p, .preguntas-partido-seo p, .noticias-relacionadas-partido > p { color: #b4c7dd; line-height: 1.7; }
.marcador-partido-resumen { display: grid; gap: 20px; overflow: hidden; border-color: #37536d; background: radial-gradient(ellipse at 50% -30%, rgba(42, 113, 152, .28), transparent 68%), linear-gradient(145deg, #10243d, #0a1c31); }
.cabecera-marcador-resumen { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.cabecera-marcador-resumen h2 { margin: 4px 0 0 !important; font-size: clamp(1.1rem, 2.3vw, 1.45rem); }
.rotulo-marcador-resumen { color: #9eb9d3; font-size: .72rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.insignia-estado-marcador { display: inline-flex; min-height: 31px; flex: 0 0 auto; align-items: center; gap: 8px; border: 1px solid #3d6681; border-radius: 999px; background: #123956; color: #b4ebff; padding: 0 12px; font-size: .68rem; font-weight: 900; letter-spacing: .07em; }
.insignia-estado-marcador i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.insignia-estado-marcador--vivo { border-color: rgba(255, 77, 93, .65); background: rgba(153, 18, 42, .22); color: #ff8391; }
.insignia-estado-marcador--vivo i { animation: pulso-estado-en-vivo 1.5s ease-in-out infinite; }
.insignia-estado-marcador--final { border-color: rgba(131, 223, 246, .35); background: rgba(27, 93, 127, .22); color: #9ce9ff; }
.insignia-estado-marcador--proximo { border-color: rgba(255, 211, 66, .38); background: rgba(119, 89, 12, .2); color: #ffdf73; }
.pizarra-marcador-partido { display: grid; min-height: 138px; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 16px; border: 1px solid rgba(147, 177, 203, .15); border-radius: 13px; background: rgba(3, 15, 30, .5); padding: 18px 20px; }
.equipo-resumen-marcador { display: flex; min-width: 0; align-items: center; gap: 13px; }
.equipo-resumen-marcador :deep(img), .escudo-resumen-fallback { display: grid; width: 56px; height: 56px; flex: 0 0 56px; place-items: center; border: 2px solid #4ccdf3; border-radius: 50%; background: #123e60; object-fit: contain; padding: 8px; }
.escudo-resumen-fallback { color: #f5f8ff; font-size: 1rem; font-weight: 900; }
.equipo-resumen-marcador > div { display: grid; min-width: 0; gap: 4px; }
.equipo-resumen-marcador small { color: #8ea9c4; font-size: .65rem; font-weight: 850; letter-spacing: .1em; }
.equipo-resumen-marcador strong { color: #f5f8ff; font-size: clamp(.86rem, 1.4vw, 1rem); line-height: 1.3; overflow-wrap: anywhere; }
.equipo-resumen-marcador--visitante { justify-content: flex-end; text-align: right; }
.centro-marcador-resumen { display: grid; min-width: 124px; justify-items: center; gap: 3px; text-align: center; }
.cifras-marcador-resumen { display: flex; align-items: center; gap: 13px; color: #fff; }
.cifras-marcador-resumen strong { font-size: clamp(2.5rem, 5vw, 3.45rem); font-variant-numeric: tabular-nums; font-weight: 950; letter-spacing: -.06em; line-height: 1; }
.cifras-marcador-resumen span { color: #ffd342; font-size: 1.5rem; font-weight: 800; }
.versus-marcador-resumen { color: #d8e6f4; font-size: 1.75rem; font-weight: 900; letter-spacing: .08em; }
.centro-marcador-resumen small { color: #91a9c0; font-size: .59rem; font-weight: 850; letter-spacing: .12em; }
.detalle-eventos-partido { display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: start; gap: 11px; border-top: 1px solid rgba(147, 177, 203, .16); padding-top: 16px; }
.detalle-eventos-partido > span { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid rgba(131, 223, 246, .32); border-radius: 50%; color: #9ce9ff; font-family: Georgia, serif; font-size: 1rem; font-style: italic; font-weight: 800; }
.detalle-eventos-partido strong { color: #e8f2fd; font-size: .88rem; }
.detalle-eventos-partido p { margin: 4px 0 0; color: #a9bfd5; font-size: .82rem; line-height: 1.55; }
@keyframes pulso-estado-en-vivo { 50% { opacity: .38; box-shadow: 0 0 0 5px rgba(255, 77, 93, .14); } }
.preguntas-partido-seo details { border-top: 1px solid #294362; padding: 13px 0; }
.preguntas-partido-seo summary { color: inherit; cursor: pointer; font-weight: 800; }
.preguntas-partido-seo a, .enlaces-mutua-partido a { color: #83dff6; font-weight: 800; }
.enlaces-mutua-partido { display: flex; flex-wrap: wrap; gap: 14px 22px; padding: 10px 0; }
.noticias-relacionadas-partido ol { display: grid; gap: 14px; margin: 16px 0 0; padding-left: 20px; }
.noticias-relacionadas-partido li a { color: #fff; font-weight: 800; }
.noticias-relacionadas-partido li p { margin: 4px 0 0; color: #afc2db; font-size: .8rem; }
body.tema-publico-blanco .pagina-partido-seo { color: #13253d; color-scheme: light; }
body.tema-publico-blanco .encabezado-partido-seo > p:last-child { color: #586980; }
body.tema-publico-blanco .encabezado-partido-seo h1 { color: #13253d; }
body.tema-publico-blanco .encabezado-partido-seo :deep(.barra-compartir-articulo) { border-color: #dce5f1; }
body.tema-publico-blanco .encabezado-partido-seo :deep(.barra-compartir-articulo strong) { color: #45566e; }
body.tema-publico-blanco .encabezado-partido-seo :deep(.barra-compartir-articulo button) { border-color: #dce3ec; background: #fff; color: #08204a; }
body.tema-publico-blanco .bloque-datos-partido-seo, body.tema-publico-blanco .preguntas-partido-seo, body.tema-publico-blanco .contexto-partido-seo, body.tema-publico-blanco .noticias-relacionadas-partido { border-color: #dce5f1; background: #fff; color: #13253d; }
body.tema-publico-blanco .bloque-datos-partido-seo h2, body.tema-publico-blanco .preguntas-partido-seo h2, body.tema-publico-blanco .contexto-partido-seo h2 { color: #13253d; }
body.tema-publico-blanco .tabs-partido-seo { border-color: #dce5f1; background: #fff; color: #13253d; }
body.tema-publico-blanco .tabs-partido-seo a { color: #586980; }
body.tema-publico-blanco .tabs-partido-seo a:first-child { color: #145996; border-color: #145996; }
body.tema-publico-blanco .tabs-partido-seo a:hover, body.tema-publico-blanco .tabs-partido-seo a:focus-visible { color: #08204a; }
body.tema-publico-blanco .bloque-datos-partido-seo dl div { background: #f1f5f9; }
body.tema-publico-blanco .bloque-datos-partido-seo dt, body.tema-publico-blanco .preguntas-partido-seo a, body.tema-publico-blanco .enlaces-mutua-partido a { color: #145996; }
body.tema-publico-blanco .bloque-datos-partido-seo > p, body.tema-publico-blanco .contexto-partido-seo p, body.tema-publico-blanco .preguntas-partido-seo p, body.tema-publico-blanco .noticias-relacionadas-partido > p, body.tema-publico-blanco .noticias-relacionadas-partido li p { color: #586980; }
body.tema-publico-blanco .noticias-relacionadas-partido li a { color: #13253d; }
body.tema-publico-blanco .encabezado-informacion-partido > span { color: #a9551c; }
body.tema-publico-blanco .encabezado-informacion-partido p { color: #586980; }
body.tema-publico-blanco .bloque-datos-partido-seo dl.lista-informacion-partido .dato-informacion-partido { border-color: #e1e8f0; background: #f6f8fb; }
body.tema-publico-blanco .icono-informacion-partido { background: #e9f3fa; color: #24618c; }
body.tema-publico-blanco .dato-informacion-partido dt { color: #65788e; }
body.tema-publico-blanco .dato-informacion-partido dd small { color: #66798e; }
body.tema-publico-blanco .nota-win-sports, body.tema-publico-blanco .nota-info-transmision { color: #586980; }
body.tema-publico-blanco .nota-anuncio-win-play { color: #68788b; }
body.tema-publico-blanco .marcador-partido-resumen { border-color: #d4e0ed; background: radial-gradient(ellipse at 50% -30%, rgba(38, 135, 177, .1), transparent 68%), linear-gradient(145deg, #fff, #f5f8fc); }
body.tema-publico-blanco .rotulo-marcador-resumen { color: #63748b; }
body.tema-publico-blanco .insignia-estado-marcador--final { border-color: #b7dfeb; background: #eaf7fb; color: #126286; }
body.tema-publico-blanco .insignia-estado-marcador--proximo { border-color: #ead99e; background: #fff9e3; color: #785b00; }
body.tema-publico-blanco .pizarra-marcador-partido { border-color: #dce5ee; background: #f6f9fc; }
body.tema-publico-blanco .equipo-resumen-marcador strong, body.tema-publico-blanco .versus-marcador-resumen { color: #13253d; }
body.tema-publico-blanco .equipo-resumen-marcador small, body.tema-publico-blanco .centro-marcador-resumen small { color: #65788e; }
body.tema-publico-blanco .escudo-resumen-fallback { background: #e7f1f8; color: #13253d; }
body.tema-publico-blanco .cifras-marcador-resumen { color: #13253d; }
body.tema-publico-blanco .detalle-eventos-partido { border-color: #dce5ee; }
body.tema-publico-blanco .detalle-eventos-partido strong { color: #13253d; }
body.tema-publico-blanco .detalle-eventos-partido p { color: #586980; }
body.tema-publico-blanco .preguntas-partido-seo details { border-color: #dce5f1; }
body.tema-publico-blanco .preguntas-partido-seo summary { color: #13253d; }
@media (max-width: 760px) {
  .contenido-partido-seo-grid { grid-template-columns: minmax(0, 1fr); }
  .bloque-datos-partido-seo dl { grid-template-columns: minmax(0, 1fr); }
  .capa-datos-reproductor { position: relative; inset: auto; width: 100%; min-height: 0; padding: 16px; }
  .equipos-cartel-partido { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; }
  .equipo-cartel-partido { min-width: 0; }
  .equipo-cartel-partido strong { max-width: 100%; overflow-wrap: anywhere; }
  .centro-cartel-partido { min-width: 0; max-width: 96px; }
  .centro-cartel-partido span { max-width: 90px; overflow-wrap: anywhere; }
}
@media (max-width: 560px) {
  .cabecera-marcador-resumen { align-items: flex-start; }
  .insignia-estado-marcador { min-height: 28px; padding: 0 9px; font-size: .59rem; }
  .pizarra-marcador-partido { min-height: 122px; gap: 7px; padding: 14px 9px; }
  .equipo-resumen-marcador, .equipo-resumen-marcador--visitante { flex-direction: column; justify-content: center; gap: 7px; text-align: center; }
  .equipo-resumen-marcador :deep(img), .escudo-resumen-fallback { width: 42px; height: 42px; flex-basis: 42px; padding: 6px; }
  .equipo-resumen-marcador strong { font-size: .76rem; }
  .equipo-resumen-marcador small { font-size: .56rem; }
  .centro-marcador-resumen { min-width: 78px; }
  .cifras-marcador-resumen { gap: 6px; }
  .cifras-marcador-resumen strong { font-size: 2.35rem; }
  .cifras-marcador-resumen span { font-size: 1rem; }
  .versus-marcador-resumen { font-size: 1.3rem; }
  .detalle-eventos-partido { gap: 9px; }
  .nota-win-sports, .nota-info-transmision { font-size: .73rem; }
  .nota-anuncio-win-play { font-size: .67rem; }
}
@media (max-width: 500px) { .equipo-cartel-partido strong { font-size: .88rem; } .equipo-cartel-partido img, .escudo-cartel-fallback { width: 68px; height: 68px; border-width: 4px; padding: 9px; } .centro-cartel-partido span { font-size: .82rem; } .marca-cartel-partido { font-size: 1.1rem; } .detalles-cartel-partido { font-size: .84rem; } }
@media (prefers-reduced-motion: reduce) { .boton-win-sports { transition: none; } .insignia-estado-marcador--vivo i { animation: none; } }
</style>
