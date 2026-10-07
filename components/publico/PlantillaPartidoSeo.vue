<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { resolverDestinoPromocionalReproductor } from '~/utils/publicidad/destinoPromocionalReproductor'
import type { ProgramacionTransmisionPublica } from '~/utils/partidos/programacion'
import { etiquetasDistribucionProgramacion } from '~/utils/partidos/programacion'
import type { NavegacionContextualPartidoSeo } from '~/types/navegacionContextualSeo'

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
  transmisiones?: ProgramacionTransmisionPublica[]
}

const props = defineProps<{
  modo: 'donde-ver' | 'como-quedo' | 'partido'
  partido: PartidoSeoVista
  noticias: ResumenArticuloPublico[]
  navegacion?: NavegacionContextualPartidoSeo | null
}>()
const { modo, partido, noticias, navegacion } = toRefs(props)

const configuracion = useRuntimeConfig()
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
const cartelPartidoUrl = computed(() => `/api/partidos-seo/${encodeURIComponent(props.partido.slug)}/imagen?formato=wide`)
const posterVideoUrl = ref(cartelPartidoUrl.value)
let clicsReproductorEnMemoria = 0
const marcadorDisponible = computed(() => props.partido.golesLocal !== null
  && props.partido.golesVisitante !== null)
const marcador = computed(() => `${props.partido.golesLocal ?? '—'}–${props.partido.golesVisitante ?? '—'}`)
const estadoPartido = computed(() => etiquetaEstadoSeoPartido(props.partido.estado))
const transmisionesConfirmadas = computed(() => (props.partido.transmisiones || [])
  .filter(transmision => transmision.status === 'confirmed'
    && Boolean(transmision.verifiedAt)
    && transmision.sourceUrl.startsWith('https://')))
const textoMarcador = computed(() => {
  if (!marcadorDisponible.value) return 'El marcador oficial todavía no está publicado.'
  if (estadoPartido.value === 'EN VIVO') return `Marcador actualizado: ${marcador.value}`
  if (estadoPartido.value === 'FINALIZADO') return `Resultado registrado: ${marcador.value}`
  return `Marcador registrado: ${marcador.value}`
})
const nombreCompetencia = computed(() => {
  if (props.partido.competencia === 'torneo-betplay') return 'Torneo BetPlay'
  if (props.partido.competencia === 'copa-colombia') return 'Copa Colombia'
  return 'Liga BetPlay'
})
const etiquetaPartido = computed(() => modoEstadoParaEtiqueta(estadoPartido.value, props.modo === 'como-quedo' ? 'como-quedo' : 'donde-ver'))
const urlProgramacionOficial = computed(() => props.partido.fuenteOficialUrl
  || `https://dimayor.com.co/programaciones-competencias-dimayor-${props.partido.temporada.slice(0, 4)}/`)

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
  if (!Number.isFinite(fecha.getTime())) return 'Verificada'
  return `Verificada el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(fecha)}`
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

onMounted(() => {
  void registrarEvento(props.modo === 'como-quedo' ? 'result_page_view' : 'match_page_view')
  if (props.modo === 'como-quedo') return
  const mesBogota = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit'
  }).format(new Date(props.partido.fechaIso))
  const posterMensual = `/partidos/${mesBogota}/${props.partido.slug}.webp`
  const imagenPoster = new Image()
  imagenPoster.onload = () => { posterVideoUrl.value = posterMensual }
  imagenPoster.onerror = () => { posterVideoUrl.value = cartelPartidoUrl.value }
  imagenPoster.src = posterMensual
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

    <header class="encabezado-partido-seo">
      <p class="etiqueta-seccion">{{ nombreCompetencia }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></p>
      <h1 v-if="modo === 'partido'">{{ partido.local }} vs {{ partido.visitante }}: fecha, hora y resultado</h1>
      <h1 v-else-if="modo === 'donde-ver'">¿Dónde ver {{ partido.local }} vs {{ partido.visitante }}?</h1>
      <h1 v-else>Cómo quedó {{ partido.local }} vs {{ partido.visitante }}</h1>
      <p v-if="modo === 'partido'">Horario de Colombia, estado y marcador verificado en una sola ficha. La programación de transmisión solo se muestra cuando tiene confirmación oficial.</p>
      <p v-else-if="modo === 'donde-ver'">Horario de Colombia, estadio y canales oficiales disponibles para el partido.</p>
      <p v-else>Consulta el estado del encuentro y el marcador publicado para {{ partido.local }} y {{ partido.visitante }}.</p>
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
      >
      <div v-if="modo !== 'como-quedo'" class="capa-datos-reproductor" aria-hidden="true">
        <div class="marca-cartel-partido"><span>Pont3la10</span><span class="competencia-cartel-partido">{{ nombreCompetencia }}</span></div>
        <span class="estado-cartel-partido" :class="{ 'estado-en-vivo': estadoPartido === 'EN VIVO' }">{{ etiquetaPartido }}</span>
        <div class="equipos-cartel-partido">
          <div class="equipo-cartel-partido">
            <img v-if="mostrarEscudo(partido.escudoLocal)" :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" @error="escudoFallido(partido.escudoLocal)">
            <span v-else class="escudo-cartel-fallback">{{ iniciales(partido.local) }}</span>
            <strong>{{ partido.local }}</strong>
            <small>LOCAL</small>
          </div>
          <div class="centro-cartel-partido">
            <b>VS</b>
            <span>{{ fechaPartido(partido.fechaIso) }}</span>
          </div>
          <div class="equipo-cartel-partido">
            <img v-if="mostrarEscudo(partido.escudoVisitante)" :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" @error="escudoFallido(partido.escudoVisitante)">
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
      <a
        v-if="modo !== 'como-quedo'"
        class="boton-programacion-oficial"
        :href="urlProgramacionOficial"
        target="_blank"
        rel="noopener noreferrer"
        @click="registrarEvento('channel_click')"
      >Consultar programación oficial</a>
      <div v-else class="nota-marcador-partido">El sitio no transmite partidos. Mostramos solo información editorial publicada.</div>
      <p v-if="modo === 'donde-ver'" class="nota-clic-promocional">Con anuncios autorizados, el primer clic en el reproductor y luego cada cuatro clics adicionales abre un enlace patrocinado.</p>
    </section>

    <div class="contenido-partido-seo-grid">
      <article class="articulo-partido-seo">
        <section v-if="modo !== 'como-quedo'" class="bloque-datos-partido-seo">
          <h2>Horario y dónde ver {{ partido.local }} vs {{ partido.visitante }}</h2>
          <dl>
            <div><dt>Fecha y hora</dt><dd>{{ fechaPartido(partido.fechaIso) }} (hora de Colombia)</dd></div>
            <div><dt>Competición</dt><dd>{{ nombreCompetencia }} · {{ partido.temporada }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></dd></div>
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
              <dd v-else>Por confirmar. No tenemos una fuente verificada para este partido.</dd>
            </div>
            <div><dt>Estadio</dt><dd>{{ partido.estadio || 'No publicado' }}<template v-if="partido.ciudad"> · {{ partido.ciudad }}</template></dd></div>
          </dl>
          <p>Verificamos las opciones de transmisión para el país indicado y enlazamos su fuente. Pont3la10 no transmite el partido.</p>
          <template v-if="modo === 'partido'">
            <h2>{{ marcadorDisponible ? 'Marcador y estado' : 'Estado del encuentro' }}</h2>
            <p class="estado-marcador-partido"><strong>{{ estadoPartido }}</strong><span>{{ marcadorDisponible ? marcador : 'Marcador pendiente' }}</span></p>
            <p>{{ textoMarcador }}</p>
            <p v-if="marcadorDisponible">Los goleadores y eventos se mostrarán cuando estén presentes en una fuente publicada y verificada.</p>
          </template>
        </section>
        <section v-else class="bloque-datos-partido-seo">
          <h2>{{ marcadorDisponible ? 'Marcador y estado' : 'Estado del encuentro' }}</h2>
          <p class="estado-marcador-partido"><strong>{{ estadoPartido }}</strong><span>{{ marcadorDisponible ? marcador : 'Marcador pendiente' }}</span></p>
          <p>{{ textoMarcador }}</p>
          <p v-if="marcadorDisponible">La programación disponible no incluye todavía el detalle verificado de goleadores o eventos.</p>
          <p>Fecha: {{ fechaPartido(partido.fechaIso) }}<template v-if="partido.estadio"> · Estadio: {{ partido.estadio }}</template></p>
        </section>

        <section v-if="modo !== 'como-quedo'" class="preguntas-partido-seo" aria-labelledby="faq-partido-seo">
          <h2 id="faq-partido-seo">Preguntas frecuentes</h2>
          <details open><summary>¿A qué hora juega {{ partido.local }} vs {{ partido.visitante }}?</summary><p>El horario publicado es {{ fechaPartido(partido.fechaIso) }}, hora de Colombia. Si la organización anuncia un cambio, esta ficha se actualizará.</p></details>
          <details><summary>¿Dónde ver {{ partido.local }} vs {{ partido.visitante }}?</summary><p v-if="transmisionesConfirmadas.length">{{ transmisionesConfirmadas.map(item => `${item.channel} (${nombrePais(item.countryCode)})`).join(', ') }}. Revisa la fuente enlazada junto a cada opción porque la disponibilidad puede variar según el país.</p><p v-else>El canal o la plataforma no está confirmado. Revisa la <a :href="urlProgramacionOficial" target="_blank" rel="noopener noreferrer" @click="registrarEvento('channel_click')">programación de DIMAYOR</a>.</p></details>
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

      <aside class="lateral-partido-seo">
        <PublicidadAdsterraSlot formato="nativo" contexto="noticias relacionadas con partido" />
        <section class="panel-noticias-lateral noticias-relacionadas-partido">
          <div class="encabezado-panel-lateral"><h2>Noticias relacionadas</h2><NuxtLink to="/liga-colombiana">Liga colombiana <span aria-hidden="true">→</span></NuxtLink></div>
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
.pagina-partido-seo { padding-bottom: 56px; }
.encabezado-partido-seo { max-width: 940px; margin-bottom: 22px; }
.encabezado-partido-seo h1 { margin: 8px 0; color: #f5f8ff; font-size: clamp(1.8rem, 4vw, 3rem); }
.encabezado-partido-seo > p:last-child { color: #afc2db; line-height: 1.6; }
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
.boton-programacion-oficial { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; border: 1px solid #59d9ff; border-radius: 10px; background: #1269a9; color: #fff; padding: 0 24px; font-weight: 900; text-decoration: none; }
.nota-marcador-partido { color: #c3d4e8; text-align: center; }
.contenido-partido-seo-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(270px, .8fr); gap: 24px; margin-top: 28px; }
.articulo-partido-seo, .lateral-partido-seo { display: grid; align-content: start; gap: 20px; min-width: 0; }
.bloque-datos-partido-seo, .preguntas-partido-seo, .contexto-partido-seo, .noticias-relacionadas-partido { border: 1px solid #294362; border-radius: 12px; background: #10243d; padding: 20px; }
.bloque-datos-partido-seo h2, .preguntas-partido-seo h2, .contexto-partido-seo h2 { margin-top: 0; }
.bloque-datos-partido-seo dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bloque-datos-partido-seo dl div { border-radius: 8px; background: rgba(4, 18, 36, .45); padding: 12px; }
.bloque-datos-partido-seo dt { color: #83dff6; font-size: .8rem; font-weight: 900; }
.bloque-datos-partido-seo dd { margin: 5px 0 0; line-height: 1.5; }
.lista-transmisiones-partido { display: grid; gap: 8px; margin: 0; padding-left: 18px; }
.lista-transmisiones-partido li { padding-left: 2px; }
.lista-transmisiones-partido a { display: inline-block; margin-left: 7px; color: #83dff6; font-weight: 850; }
.lista-transmisiones-partido small { display: block; margin-top: 3px; color: #a9bdd4; font-size: .7rem; }
.bloque-datos-partido-seo > p, .contexto-partido-seo p, .preguntas-partido-seo p, .noticias-relacionadas-partido > p { color: #b4c7dd; line-height: 1.7; }
.estado-marcador-partido { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; border-radius: 10px; background: #07192e; padding: 15px; font-size: 1.2rem; }
.estado-marcador-partido strong { color: #83dff6; }
.estado-marcador-partido span { color: #ffd342; font-size: 1.6rem; font-weight: 900; }
.preguntas-partido-seo details { border-top: 1px solid #294362; padding: 13px 0; }
.preguntas-partido-seo summary { cursor: pointer; font-weight: 800; }
.preguntas-partido-seo a, .enlaces-mutua-partido a { color: #83dff6; font-weight: 800; }
.enlaces-mutua-partido { display: flex; flex-wrap: wrap; gap: 14px 22px; padding: 10px 0; }
.noticias-relacionadas-partido ol { display: grid; gap: 14px; margin: 16px 0 0; padding-left: 20px; }
.noticias-relacionadas-partido li a { color: #fff; font-weight: 800; }
.noticias-relacionadas-partido li p { margin: 4px 0 0; color: #afc2db; font-size: .8rem; }
body.tema-publico-blanco .encabezado-partido-seo > p:last-child { color: #586980; }
body.tema-publico-blanco .encabezado-partido-seo h1 { color: #13253d; }
body.tema-publico-blanco .bloque-datos-partido-seo, body.tema-publico-blanco .preguntas-partido-seo, body.tema-publico-blanco .contexto-partido-seo, body.tema-publico-blanco .noticias-relacionadas-partido { border-color: #dce5f1; background: #fff; color: #13253d; }
body.tema-publico-blanco .bloque-datos-partido-seo dl div, body.tema-publico-blanco .estado-marcador-partido { background: #f1f5f9; }
body.tema-publico-blanco .bloque-datos-partido-seo dt, body.tema-publico-blanco .preguntas-partido-seo a, body.tema-publico-blanco .enlaces-mutua-partido a { color: #145996; }
body.tema-publico-blanco .bloque-datos-partido-seo > p, body.tema-publico-blanco .contexto-partido-seo p, body.tema-publico-blanco .preguntas-partido-seo p, body.tema-publico-blanco .noticias-relacionadas-partido > p, body.tema-publico-blanco .noticias-relacionadas-partido li p { color: #586980; }
body.tema-publico-blanco .noticias-relacionadas-partido li a { color: #13253d; }
@media (max-width: 760px) { .contenido-partido-seo-grid { grid-template-columns: minmax(0, 1fr); } .bloque-datos-partido-seo dl { grid-template-columns: minmax(0, 1fr); } .capa-datos-reproductor { min-height: 22vw; } }
@media (max-width: 500px) { .equipos-cartel-partido { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; } .equipo-cartel-partido strong { font-size: .88rem; } .equipo-cartel-partido img, .escudo-cartel-fallback { width: 68px; height: 68px; border-width: 4px; padding: 9px; } .centro-cartel-partido span { font-size: .82rem; } .marca-cartel-partido { font-size: 1.1rem; } .detalles-cartel-partido { font-size: .84rem; } }
</style>
