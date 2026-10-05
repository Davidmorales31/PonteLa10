<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

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
  escudoLocal: string | null
  escudoVisitante: string | null
  verificadoEn: string
}

const props = defineProps<{
  modo: 'donde-ver' | 'como-quedo'
  partido: PartidoSeoVista
  noticias: ResumenArticuloPublico[]
}>()
const { modo, partido, noticias } = toRefs(props)

const { registrarEvento } = useAnaliticaPublica()
const escudosFallidos = ref<string[]>([])
const marcadorDisponible = computed(() => props.partido.golesLocal !== null
  && props.partido.golesVisitante !== null)
const marcador = computed(() => `${props.partido.golesLocal ?? '—'}–${props.partido.golesVisitante ?? '—'}`)
const estadoPartido = computed(() => etiquetaEstadoSeoPartido(props.partido.estado))
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
const etiquetaPartido = computed(() => modoEstadoParaEtiqueta(estadoPartido.value, props.modo))

function fechaPartido(valor: string, incluirHora = true) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    ...(incluirHora ? { timeStyle: 'short' as const } : {}),
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('es-CO')
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

onMounted(() => {
  void registrarEvento(props.modo === 'donde-ver' ? 'match_page_view' : 'result_page_view')
})
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio pagina-partido-seo">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><NuxtLink to="/liga-colombiana">Liga colombiana</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">{{ modo === 'donde-ver' ? 'Dónde ver' : 'Cómo quedó' }} {{ partido.local }} vs {{ partido.visitante }}</span></li>
      </ol>
    </nav>

    <header class="encabezado-partido-seo">
      <p class="etiqueta-seccion">{{ nombreCompetencia }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></p>
      <h1 v-if="modo === 'donde-ver'">¿Dónde ver {{ partido.local }} vs {{ partido.visitante }}?</h1>
      <h1 v-else>Cómo quedó {{ partido.local }} vs {{ partido.visitante }}</h1>
      <p v-if="modo === 'donde-ver'">Horario de Colombia, estadio y canales oficiales disponibles para el partido.</p>
      <p v-else>Consulta el estado del encuentro y el marcador publicado para {{ partido.local }} y {{ partido.visitante }}.</p>
    </header>

    <section class="cartel-partido-seo" :class="{ 'cartel-resultado': modo === 'como-quedo' }" aria-label="Datos del partido">
      <img class="fondo-animado-partido" src="/editorial/liga-betplay-ambiente.gif" alt="" aria-hidden="true">
      <div class="capa-cartel-partido" aria-hidden="true" />
      <div class="marca-cartel-partido"><span>Pont3la10</span><span class="competencia-cartel-partido">{{ nombreCompetencia }}</span></div>
      <span class="estado-cartel-partido" :class="{ 'estado-en-vivo': estadoPartido === 'EN VIVO' }">{{ etiquetaPartido }}</span>
      <div class="equipos-cartel-partido">
        <div class="equipo-cartel-partido">
          <img v-if="mostrarEscudo(partido.escudoLocal)" :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" @error="escudoFallido(partido.escudoLocal)">
          <span v-else class="escudo-cartel-fallback" aria-hidden="true">{{ iniciales(partido.local) }}</span>
          <strong>{{ partido.local }}</strong>
          <small>LOCAL</small>
        </div>
        <div class="centro-cartel-partido">
          <b>{{ modo === 'como-quedo' && marcadorDisponible ? marcador : 'VS' }}</b>
          <span>{{ modo === 'como-quedo' ? textoMarcador : fechaPartido(partido.fechaIso) }}</span>
        </div>
        <div class="equipo-cartel-partido">
          <img v-if="mostrarEscudo(partido.escudoVisitante)" :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" @error="escudoFallido(partido.escudoVisitante)">
          <span v-else class="escudo-cartel-fallback" aria-hidden="true">{{ iniciales(partido.visitante) }}</span>
          <strong>{{ partido.visitante }}</strong>
          <small>VISITANTE</small>
        </div>
      </div>
      <p class="detalles-cartel-partido">
        <span>{{ fechaPartido(partido.fechaIso) }}</span>
        <span v-if="partido.estadio">{{ partido.estadio }}</span>
        <span v-if="partido.ciudad">{{ partido.ciudad }}</span>
      </p>
      <a
        v-if="modo === 'donde-ver'"
        class="boton-programacion-oficial"
        href="https://dimayor.com.co/programaciones-competencias-dimayor-2026/"
        target="_blank"
        rel="noopener noreferrer"
        @click="registrarEvento('channel_click')"
      >Consultar programación oficial</a>
      <div v-else class="nota-marcador-partido">El sitio no transmite partidos. Mostramos solo información editorial publicada.</div>
    </section>

    <PublicidadAdsterraSlot formato="leaderboard" contexto="página SEO de partido" />

    <div class="contenido-partido-seo-grid">
      <article class="articulo-partido-seo">
        <section v-if="modo === 'donde-ver'" class="bloque-datos-partido-seo">
          <h2>Horario y dónde ver {{ partido.local }} vs {{ partido.visitante }}</h2>
          <dl>
            <div><dt>Fecha y hora</dt><dd>{{ fechaPartido(partido.fechaIso) }} (hora de Colombia)</dd></div>
            <div><dt>Competición</dt><dd>{{ nombreCompetencia }} · {{ partido.temporada }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></dd></div>
            <div><dt>Canal o plataforma</dt><dd>Por confirmar en una programación oficial para este partido.</dd></div>
            <div><dt>Estadio</dt><dd>{{ partido.estadio || 'No publicado' }}<template v-if="partido.ciudad"> · {{ partido.ciudad }}</template></dd></div>
          </dl>
          <p>Consulta la programación oficial antes del encuentro. No enlazamos retransmisiones no autorizadas ni afirmamos que Pont3la10 transmita el partido.</p>
        </section>
        <section v-else class="bloque-datos-partido-seo">
          <h2>{{ marcadorDisponible ? 'Marcador y estado' : 'Estado del encuentro' }}</h2>
          <p class="estado-marcador-partido"><strong>{{ estadoPartido }}</strong><span>{{ marcadorDisponible ? marcador : 'Marcador pendiente' }}</span></p>
          <p>{{ textoMarcador }}</p>
          <p v-if="marcadorDisponible">La programación disponible no incluye todavía el detalle verificado de goleadores o eventos.</p>
          <p>Fecha: {{ fechaPartido(partido.fechaIso) }}<template v-if="partido.estadio"> · Estadio: {{ partido.estadio }}</template></p>
        </section>

        <section v-if="modo === 'donde-ver'" class="preguntas-partido-seo" aria-labelledby="faq-partido-seo">
          <h2 id="faq-partido-seo">Preguntas frecuentes</h2>
          <details open><summary>¿A qué hora juega {{ partido.local }} vs {{ partido.visitante }}?</summary><p>El horario publicado es {{ fechaPartido(partido.fechaIso) }}, hora de Colombia. Si la organización anuncia un cambio, esta ficha se actualizará.</p></details>
          <details><summary>¿Dónde ver {{ partido.local }} vs {{ partido.visitante }}?</summary><p>El canal o plataforma no está confirmado en los datos públicos disponibles. Consulta la <a href="https://dimayor.com.co/programaciones-competencias-dimayor-2026/" target="_blank" rel="noopener noreferrer" @click="registrarEvento('channel_click')">programación oficial de DIMAYOR</a>.</p></details>
        </section>
        <section v-else class="contexto-partido-seo">
          <h2>Información del partido</h2>
          <p>{{ nombreCompetencia }} {{ partido.temporada }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template>. Los goleadores, las alineaciones y el resumen se mostrarán solo cuando estén presentes en una fuente publicada y verificada.</p>
        </section>

        <nav class="enlaces-mutua-partido" aria-label="Más información del encuentro">
          <NuxtLink
            v-if="modo === 'donde-ver'"
            :to="`/como-quedo/${partido.slug}`"
            @click="registrarEvento('internal_match_link_click')"
          >Ver resultado y cómo quedó <span aria-hidden="true">→</span></NuxtLink>
          <NuxtLink
            v-else
            :to="`/donde-ver/${partido.slug}`"
            @click="registrarEvento('internal_match_link_click')"
          >Horario y dónde ver el partido <span aria-hidden="true">→</span></NuxtLink>
          <NuxtLink to="/liga-colombiana">Liga colombiana <span aria-hidden="true">→</span></NuxtLink>
        </nav>
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
.cartel-partido-seo { position: relative; display: grid; min-height: 450px; overflow: hidden; align-content: center; justify-items: center; gap: 18px; border: 1px solid #28708b; border-radius: 18px; background: #061b35; padding: 28px; isolation: isolate; }
.fondo-animado-partido, .capa-cartel-partido { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.fondo-animado-partido { opacity: .32; }
.capa-cartel-partido { z-index: -1; background: linear-gradient(120deg, rgba(3,17,37,.88), rgba(4,35,66,.75) 50%, rgba(3,17,37,.9)); }
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
@media (max-width: 760px) { .contenido-partido-seo-grid { grid-template-columns: minmax(0, 1fr); } .cartel-partido-seo { min-height: 390px; padding: 18px; } .bloque-datos-partido-seo dl { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 500px) { .equipos-cartel-partido { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; } .equipo-cartel-partido strong { font-size: .88rem; } .equipo-cartel-partido img, .escudo-cartel-fallback { width: 68px; height: 68px; border-width: 4px; padding: 9px; } .centro-cartel-partido span { font-size: .82rem; } .marca-cartel-partido { font-size: 1.1rem; } .detalles-cartel-partido { font-size: .84rem; } }
</style>
