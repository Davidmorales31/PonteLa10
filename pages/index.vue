<script setup lang="ts">
import { categoriasSitio } from '~/data/sitioPublico'
import PublicidadHouseAd from '~/components/publicidad/HouseAd.vue'
import BotonSeguirEquipo from '~/components/publico/BotonSeguirEquipo.vue'
import BotonSeguirJugador from '~/components/publico/BotonSeguirJugador.vue'
import BotonSeguirCompeticion from '~/components/publico/BotonSeguirCompeticion.vue'
import {
  buscarPerfilJugadorEuropa,
  jugadoresColombianosEuropa
} from '~/data/jugadoresColombianosEuropa'
import {
  calendarioOficialSeleccion,
  convocatoriasOficialesSeleccion,
  fechaVerificacionSeleccion
} from '~/data/seleccionColombia2026'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { ArticuloResumen } from '~/types/editorial'
import type { RespuestaResultados } from '~/types/resultados'
import type { PerfilJugadorEuropa } from '~/data/jugadoresColombianosEuropa'
import type { EquipoSeguidoResumen } from '~/types/seguimientoEquipos'
import type { CompeticionSeguidaPortada } from '~/utils/seguimientoCompeticiones'
import type { PartidoLigaPortada } from '~/utils/portadaPublica'
import {
  crearResumenCompeticionSeguida,
  crearResumenCompeticionSinDatos
} from '~/utils/seguimientoCompeticiones'
import { esResumenArticuloPublico } from '~/utils/articulosPublicos'
import {
  filtrarNoticiasEuropa,
  filtrarNoticiasLiga,
  filtrarNoticiasSeleccion,
  obtenerProximoPartidoLiga,
  obtenerResultadosLigaRecientes,
  separarJornadaPortada
} from '~/utils/portadaPublica'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

type ArticuloPortada = ArticuloResumen & { fechaPublicacion: string }
interface FilaTablaLigaPortada {
  competencia: string
  temporada: string
  fase: string
  equipoClave: string
  equipo: string
  posicion: number
  puntos: number
  escudo: string | null
  verificadoEn: string
}
interface RespuestaLigaPortada {
  estado: 'disponible' | 'sin_datos'
  partidos: PartidoLigaPortada[]
  tabla: FilaTablaLigaPortada[]
  consultadoEn: string
}
interface ResultadoRecientePortada {
  id: string
  ruta: string
  competencia: string
  fechaIso: string
  local: string
  visitante: string
  golesLocal: number | null
  golesVisitante: number | null
  escudoLocal: string | null
  escudoVisitante: string | null
}
interface JugadorSeguidoPortada {
  perfil: PerfilJugadorEuropa
  noticias: ResumenArticuloPublico[]
  error: boolean
}

const instantePortada = useState('portada-instante-renderizado', () => new Date().toISOString())
const respuestaResultadosVacia: RespuestaResultados = {
  partidos: [],
  clasificacion: [],
  actualizadoEn: '',
  origen: 'base-datos'
}
const respuestaLigaVacia: RespuestaLigaPortada = {
  estado: 'sin_datos',
  partidos: [],
  tabla: [],
  consultadoEn: ''
}
const [consultaResultados, consultaLiga, consultaArticulos, consultaDestacada,
  consultaLigaArticulos, consultaSeleccionArticulos, consultaEuropaArticulos] = await Promise.all([
  useFetch<RespuestaResultados>('/api/resultados', {
    key: 'resultados-portada-futbol',
    query: { deporte: 'futbol', timeZone: zonaHorariaColombia },
    default: () => respuestaResultadosVacia,
    ignoreResponseError: true
  }),
  useFetch<RespuestaLigaPortada>('/api/liga-colombiana', {
    key: 'liga-colombiana-portada',
    default: () => respuestaLigaVacia,
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>('/api/articulos', {
    key: 'articulos-publicados-portada',
    query: { limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico | null>('/api/articulos/destacada', {
    key: 'articulo-destacado-portada',
    default: () => null,
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>('/api/articulos', {
    key: 'articulos-liga-betplay-portada',
    query: { tema: 'liga-betplay', limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>('/api/articulos', {
    key: 'articulos-seleccion-colombia-portada',
    query: { tema: 'seleccion-colombia', limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>('/api/articulos', {
    key: 'articulos-colombianos-europa-portada',
    query: { tema: 'colombianos-en-europa', limite: 8 },
    default: () => [],
    ignoreResponseError: true
  })
])
const resultados = consultaResultados.data
const estadoResultados = consultaResultados.status
const datosLiga = consultaLiga.data
const respuestaPublicacionesReales = consultaArticulos.data
const respuestaPublicacionDestacada = consultaDestacada.data
const respuestaArticulosLiga = consultaLigaArticulos.data
const respuestaArticulosSeleccion = consultaSeleccionArticulos.data
const respuestaArticulosEuropa = consultaEuropaArticulos.data
const publicacionesReales = computed(() => Array.isArray(respuestaPublicacionesReales.value)
  ? respuestaPublicacionesReales.value.filter(esResumenArticuloPublico)
  : [])
const publicacionDestacada = computed(() => esResumenArticuloPublico(respuestaPublicacionDestacada.value)
  ? respuestaPublicacionDestacada.value
  : null)
function mapearArticuloPortada(articulo: ResumenArticuloPublico): ArticuloPortada {
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
}
const articulosPublicados = computed<ArticuloPortada[]>(() => publicacionesReales.value.map(mapearArticuloPortada))
const articuloDestacado = computed<ArticuloPortada | null>(() => {
  const articulo = publicacionDestacada.value
  if (!articulo) return null
  return mapearArticuloPortada(articulo)
})
const portadaPrincipal = computed(() => articuloDestacado.value || articulosPublicados.value[0] || null)
const noticiasSecundarias = computed(() => articulosPublicados.value
  .filter(articulo => articulo.slug !== portadaPrincipal.value?.slug)
  .slice(0, 2)
)
const slugsApertura = computed(() => new Set([
  portadaPrincipal.value?.slug,
  ...noticiasSecundarias.value.map(articulo => articulo.slug)
].filter((slug): slug is string => Boolean(slug))))
const ultimasNoticias = computed(() => articulosPublicados.value
  .filter(articulo => !slugsApertura.value.has(articulo.slug))
)
const partidosLiga = computed(() => (datosLiga.value?.partidos || []).filter(partido =>
  ['liga-betplay', 'torneo-betplay', 'copa-colombia'].includes(partido.competencia)
))
const tablaLiga = computed(() => (datosLiga.value?.tabla || [])
  .filter(fila => fila.competencia === 'liga-betplay')
  .slice(0, 5)
)
const partidoLigaDestacado = computed(() => obtenerProximoPartidoLiga(partidosLiga.value, instantePortada.value))
const resultadosLigaRecientes = computed(() => obtenerResultadosLigaRecientes(partidosLiga.value, instantePortada.value, 3))
const jornadaPortada = computed(() => separarJornadaPortada(
  Array.isArray(resultados.value?.partidos) ? resultados.value.partidos : [],
  instantePortada.value
))
const resultadosRecientesPortada = computed<ResultadoRecientePortada[]>(() => {
  const resultadosDeHoy = jornadaPortada.value.finalizados
    .filter(partido => Number.isFinite(partido.marcadorLocal) && Number.isFinite(partido.marcadorVisitante))
    .slice(0, 3)
    .map(partido => ({
      id: partido.id,
      ruta: `/resultados/${encodeURIComponent(partido.id)}`,
      competencia: partido.competencia,
      fechaIso: partido.fechaIso,
      local: partido.equipoLocal.nombre,
      visitante: partido.equipoVisitante.nombre,
      golesLocal: partido.marcadorLocal ?? null,
      golesVisitante: partido.marcadorVisitante ?? null,
      escudoLocal: partido.equipoLocal.logo || null,
      escudoVisitante: partido.equipoVisitante.logo || null
    }))
  if (resultadosDeHoy.length) return resultadosDeHoy

  return resultadosLigaRecientes.value.map(partido => ({
    id: partido.slug,
    ruta: `/partidos/${encodeURIComponent(partido.slug)}`,
    competencia: partido.competencia,
    fechaIso: partido.fechaIso,
    local: partido.local,
    visitante: partido.visitante,
    golesLocal: partido.golesLocal,
    golesVisitante: partido.golesVisitante,
    escudoLocal: partido.escudoLocal || null,
    escudoVisitante: partido.escudoVisitante || null
  }))
})
const partidosFranja = computed(() => [...jornadaPortada.value.enVivo, ...jornadaPortada.value.proximos]
  .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso)))
const noticiasLigaPortada = computed(() => {
  const respuesta = Array.isArray(respuestaArticulosLiga.value)
    ? respuestaArticulosLiga.value.filter(esResumenArticuloPublico)
    : []
  const equipos = (datosLiga.value?.tabla || [])
    .filter(fila => fila.competencia === 'liga-betplay')
    .map(fila => fila.equipo)
  return filtrarNoticiasLiga(respuesta, equipos, 2).map(mapearArticuloPortada)
})
const noticiasSeleccionPortada = computed(() => {
  const respuesta = Array.isArray(respuestaArticulosSeleccion.value)
    ? respuestaArticulosSeleccion.value.filter(esResumenArticuloPublico)
    : []
  return filtrarNoticiasSeleccion(respuesta, 2).map(mapearArticuloPortada)
})
const noticiasEuropaPortada = computed(() => {
  const respuesta = Array.isArray(respuestaArticulosEuropa.value)
    ? respuestaArticulosEuropa.value.filter(esResumenArticuloPublico)
    : []
  return filtrarNoticiasEuropa(respuesta, jugadoresColombianosEuropa.map(jugador => jugador.nombre), 3)
    .map(mapearArticuloPortada)
})
const perfilesEuropaPortada = computed(() => jugadoresColombianosEuropa.slice(0, 4))
const fechaHoyPortada = computed(() => obtenerFechaEnZonaHoraria(new Date(instantePortada.value)))
const proximoPartidoSeleccion = computed(() => calendarioOficialSeleccion
  .filter(partido => partido.fecha >= fechaHoyPortada.value)
  .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null
)
const convocatoriaVigente = computed(() => convocatoriasOficialesSeleccion
  .filter(convocatoria => convocatoria.vigenteHasta >= fechaHoyPortada.value)
  .sort((a, b) => b.publicadaEn.localeCompare(a.publicadaEn))[0] || null
)
const noticiaAnalisis = computed(() => articulosPublicados.value.find(articulo =>
  /especial|opini[oó]n|an[aá]lisis|explica/i.test(`${articulo.categoria} ${articulo.titulo}`)
) || null)
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

const { competicionesSeguidas, seguimientoCompeticionesHidratado } = useSeguimientoCompeticiones()
const actualidadCompeticionesSeguidas = ref<CompeticionSeguidaPortada[]>([])
const cargandoCompeticionesSeguidas = ref(false)
let secuenciaCargaCompeticionesSeguidas = 0

watch([seguimientoCompeticionesHidratado, competicionesSeguidas], async ([hidratado, slugs]) => {
  if (!hidratado) return

  const secuencia = ++secuenciaCargaCompeticionesSeguidas
  if (!slugs.length) {
    actualidadCompeticionesSeguidas.value = []
    cargandoCompeticionesSeguidas.value = false
    return
  }

  cargandoCompeticionesSeguidas.value = true
  const respuestas = await Promise.all(slugs.map(async (slug) => {
    try {
      const ficha = await $fetch<unknown>(`/api/competiciones/${encodeURIComponent(slug)}`)
      return crearResumenCompeticionSeguida(slug, ficha)
        || crearResumenCompeticionSinDatos(slug)
    } catch {
      return crearResumenCompeticionSinDatos(slug)
    }
  }))

  if (secuencia === secuenciaCargaCompeticionesSeguidas) {
    actualidadCompeticionesSeguidas.value = respuestas.filter((respuesta): respuesta is CompeticionSeguidaPortada => respuesta !== null)
    cargandoCompeticionesSeguidas.value = false
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

function fechaPartidoPortada(fecha: string) {
  if (!Number.isFinite(Date.parse(fecha))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: zonaHorariaColombia
  }).format(new Date(fecha))
}

function horaPartidoPortada(fecha: string) {
  if (!Number.isFinite(Date.parse(fecha))) return 'Hora por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: zonaHorariaColombia
  }).format(new Date(fecha))
}

function fechaSeleccionPortada(fecha: string) {
  const valor = new Date(`${fecha}T12:00:00.000Z`)
  if (!Number.isFinite(valor.getTime())) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: zonaHorariaColombia
  }).format(valor)
}

function fechaPublicaPortada(fecha: string) {
  if (!Number.isFinite(Date.parse(fecha))) return 'sin fecha de verificación'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeZone: zonaHorariaColombia
  }).format(new Date(fecha))
}

const horasPublicacion = computed(() => new Map(
  publicacionesReales.value.map(articulo => [articulo.slug, obtenerHoraPublicacion(articulo.publicadoEn)])
))

useSeoPont3la10(() => ({
  titulo: 'Pont3la10 | Fútbol colombiano, partidos y noticias',
  descripcion: 'Partidos de hoy, resultados recientes, Liga BetPlay, Selección Colombia y noticias de futbolistas colombianos en Europa.',
  rutaCanonica: '/',
  imagen: portadaPrincipal.value?.imagen,
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Pont3la10',
    description: 'Partidos de hoy, resultados, fútbol colombiano y actualidad de la Selección Colombia y sus futbolistas en Europa.',
    inLanguage: 'es-CO'
  }
}))
</script>

<template>
  <div class="portada-medio">
    <EsqueletoResultados v-if="estadoResultados === 'pending'" tipo="franja" />
    <FranjaMarcadores v-else-if="partidosFranja.length" :partidos="partidosFranja" destino="/partidos-hoy" />
    <div class="medio-contenedor">
      <div class="medio-edicion"><span>LA JUGADA CLARA</span><span>Deporte · Tecnología · Actualidad</span></div>
      <section class="medio-apertura" :class="{ 'sin-secundarias': !noticiasSecundarias.length }" aria-labelledby="titulo-portada-home">
        <div class="medio-introduccion">
          <p class="home-antetitulo">LA JUGADA CLARA · FÚTBOL COLOMBIANO</p>
          <h1 id="titulo-portada-home">Fútbol colombiano y Selección Colombia</h1>
          <p>Partidos, resultados y noticias de la Liga BetPlay, la Selección y nuestros futbolistas en el exterior, con fuentes y fechas claras.</p>
        </div>
        <template v-if="portadaPrincipal">
          <NoticiaPortada :articulo="portadaPrincipal" principal nivel-titulo="h2" />
          <div v-if="noticiasSecundarias.length" class="medio-secundarias">
            <NoticiaPortada v-for="articulo in noticiasSecundarias" :key="articulo.slug" :articulo="articulo" />
          </div>
        </template>
        <div v-else class="medio-vacio">
          <h2>La actualidad empieza aquí</h2>
          <p>Las noticias aparecerán cuando el equipo editorial las publique.</p>
        </div>
      </section>

      <section class="medio-seccion home-jornada" aria-labelledby="titulo-jornada-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">FÚTBOL DE HOY</p><h2 id="titulo-jornada-home">Tu jornada</h2><p>Partidos y marcadores confirmados · hora de Colombia</p></div>
          <NuxtLink to="/partidos-hoy">Abrir agenda <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="home-jornada-grid">
          <section class="home-panel" aria-labelledby="titulo-partidos-hoy-home">
            <div class="home-encabezado-panel"><h3 id="titulo-partidos-hoy-home">Partidos de hoy</h3><NuxtLink to="/partidos-hoy">Ver agenda</NuxtLink></div>
            <ul v-if="jornadaPortada.partidos.length" class="home-lista-partidos">
              <li v-for="partido in jornadaPortada.partidos.slice(0, 5)" :key="partido.id">
                <NuxtLink :to="`/resultados/${encodeURIComponent(partido.id)}`" class="home-partido-link">
                  <span class="home-partido-meta"><span>{{ partido.competencia }}</span><span :class="{ 'home-estado-vivo': partido.estado === 'en-vivo' }">{{ partido.estado === 'en-vivo' ? 'EN VIVO' : partido.estado === 'finalizado' ? 'FINALIZADO' : 'PRÓXIMO' }}</span></span>
                  <span class="home-equipos-partido">
                    <span><EscudoEquipo :equipo="partido.equipoLocal" tamano="pequeno" /><strong>{{ partido.equipoLocal.nombre }}</strong></span>
                    <b>{{ partido.estado === 'programado' ? 'vs' : `${partido.marcadorLocal ?? '—'}–${partido.marcadorVisitante ?? '—'}` }}</b>
                    <span><EscudoEquipo :equipo="partido.equipoVisitante" tamano="pequeno" /><strong>{{ partido.equipoVisitante.nombre }}</strong></span>
                  </span>
                  <time :datetime="partido.fechaIso">{{ partido.estado === 'finalizado' ? fechaPartidoPortada(partido.fechaIso) : `${fechaPartidoPortada(partido.fechaIso)} · ${horaPartidoPortada(partido.fechaIso)}` }}</time>
                </NuxtLink>
              </li>
            </ul>
            <p v-else class="home-sin-datos">No hay partidos de fútbol publicados para hoy. La agenda se actualizará cuando lleguen fixtures confirmados.</p>
          </section>

          <section class="home-panel" aria-labelledby="titulo-resultados-recientes-home">
            <div class="home-encabezado-panel"><h3 id="titulo-resultados-recientes-home">Resultados recientes</h3><NuxtLink to="/resultados">Todos los resultados</NuxtLink></div>
            <ul v-if="resultadosRecientesPortada.length" class="home-lista-resultados">
              <li v-for="partido in resultadosRecientesPortada" :key="partido.id">
                <NuxtLink :to="partido.ruta" class="home-resultado-link">
                  <span class="home-resultado-meta">{{ partido.competencia }} · {{ fechaPartidoPortada(partido.fechaIso) }}</span>
                  <span class="home-equipos-resultado">
                    <span><EscudoEquipoPublico v-if="partido.escudoLocal" :src="partido.escudoLocal" :alt="`Escudo de ${partido.local}`" :width="26" :height="26" sizes="26px" loading="lazy" /><b v-else aria-hidden="true">{{ partido.local.slice(0, 1) }}</b>{{ partido.local }}</span>
                    <strong>{{ partido.golesLocal ?? '—' }}–{{ partido.golesVisitante ?? '—' }}</strong>
                    <span><EscudoEquipoPublico v-if="partido.escudoVisitante" :src="partido.escudoVisitante" :alt="`Escudo de ${partido.visitante}`" :width="26" :height="26" sizes="26px" loading="lazy" /><b v-else aria-hidden="true">{{ partido.visitante.slice(0, 1) }}</b>{{ partido.visitante }}</span>
                  </span>
                </NuxtLink>
              </li>
            </ul>
            <p v-else class="home-sin-datos">Todavía no hay marcadores finales confirmados para mostrar.</p>
          </section>
        </div>
        <PublicidadAdsterraSlot formato="nativo" contexto="inicio y jornada de fútbol" />
      </section>

      <section class="medio-seccion home-bloque-tematico home-liga" aria-labelledby="titulo-liga-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">FÚTBOL COLOMBIANO</p><h2 id="titulo-liga-home">Liga BetPlay</h2><p>Posiciones, próximo partido y actualidad del torneo.</p></div>
          <NuxtLink to="/liga-colombiana">Ir al hub de Liga <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="home-liga-grid">
          <section class="home-panel home-tabla-panel" aria-labelledby="titulo-tabla-home">
            <div class="home-encabezado-panel home-tabla-titulo">
              <div><p>{{ tablaLiga[0]?.temporada || 'Liga BetPlay' }}<template v-if="tablaLiga[0]?.fase"> · {{ tablaLiga[0].fase }}</template></p><h3 id="titulo-tabla-home">Tabla de posiciones</h3></div>
              <time v-if="tablaLiga[0]?.verificadoEn" :datetime="tablaLiga[0].verificadoEn">Actualizada {{ fechaPublicaPortada(tablaLiga[0].verificadoEn) }}</time>
            </div>
            <div v-if="tablaLiga.length" class="home-tabla-scroll">
              <table class="home-tabla">
                <caption class="solo-lectores-pantalla">Primeros puestos verificados de la Liga BetPlay</caption>
                <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">Pts</th></tr></thead>
                <tbody>
                  <tr v-for="fila in tablaLiga" :key="fila.equipoClave">
                    <td>{{ fila.posicion }}</td>
                    <th scope="row"><span class="home-equipo-tabla"><EscudoEquipoPublico v-if="fila.escudo" :src="fila.escudo" :alt="`Escudo de ${fila.equipo}`" :width="27" :height="27" sizes="27px" loading="lazy" /><b v-else aria-hidden="true">{{ fila.equipo.slice(0, 1) }}</b><NuxtLink v-if="fila.equipoClave" :to="`/equipos/${encodeURIComponent(fila.equipoClave)}`">{{ fila.equipo }}</NuxtLink><span v-else>{{ fila.equipo }}</span></span></th>
                    <td><strong>{{ fila.puntos }}</strong></td>
                  </tr>
                </tbody>
              </table>
              <NuxtLink class="home-enlace-panel" to="/liga-colombiana#posiciones">Ver tabla completa <span aria-hidden="true">→</span></NuxtLink>
            </div>
            <p v-else class="home-sin-datos">La tabla oficial todavía no está disponible en los datos públicos.</p>
          </section>

          <div class="home-columna-liga">
            <article class="home-panel home-proximo-partido">
              <div class="home-encabezado-panel"><h3>{{ partidoLigaDestacado && /live|en.?vivo|in.?play/i.test(partidoLigaDestacado.estado) ? 'En juego' : 'Próximo partido' }}</h3><NuxtLink to="/liga-colombiana#partidos">Calendario</NuxtLink></div>
              <NuxtLink v-if="partidoLigaDestacado" :to="`/partidos/${encodeURIComponent(partidoLigaDestacado.slug)}`" class="home-proximo-link">
                <span>{{ partidoLigaDestacado.competencia === 'torneo-betplay' ? 'Torneo BetPlay' : partidoLigaDestacado.competencia === 'copa-colombia' ? 'Copa Colombia' : 'Liga BetPlay' }}</span>
                <strong>{{ partidoLigaDestacado.local }} <small>vs</small> {{ partidoLigaDestacado.visitante }}</strong>
                <time :datetime="partidoLigaDestacado.fechaIso">{{ fechaPartidoPortada(partidoLigaDestacado.fechaIso) }} · {{ horaPartidoPortada(partidoLigaDestacado.fechaIso) }}</time>
              </NuxtLink>
              <p v-else class="home-sin-datos">No hay próximo partido confirmado en el calendario público.</p>
            </article>
            <div v-if="noticiasLigaPortada.length" class="home-noticias-modulo">
              <TarjetaArticuloPortada v-for="articulo in noticiasLigaPortada" :key="articulo.slug" :articulo="articulo" />
            </div>
            <p v-else class="home-sin-datos home-sin-datos-contenido">No hay noticias publicadas que correspondan claramente con la Liga BetPlay.</p>
          </div>
        </div>
      </section>

      <section class="medio-seccion home-bloque-tematico home-seleccion" aria-labelledby="titulo-seleccion-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">FÚTBOL DE SELECCIONES</p><h2 id="titulo-seleccion-home">Selección Colombia</h2><p>Agenda y convocatorias contrastadas con la Federación Colombiana de Fútbol.</p></div>
          <NuxtLink to="/seleccion-colombia">Ver Selección Colombia <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="home-seleccion-grid">
          <article class="home-panel home-seleccion-agenda">
            <div class="home-encabezado-panel"><h3>Próximo partido oficial</h3><span>FCF</span></div>
            <template v-if="proximoPartidoSeleccion">
              <p>{{ proximoPartidoSeleccion.seleccion }} · {{ proximoPartidoSeleccion.competencia }}</p>
              <strong>{{ proximoPartidoSeleccion.local }} <small>vs</small> {{ proximoPartidoSeleccion.visitante }}</strong>
              <time :datetime="proximoPartidoSeleccion.fechaIso || proximoPartidoSeleccion.fecha">{{ fechaSeleccionPortada(proximoPartidoSeleccion.fecha) }}<template v-if="proximoPartidoSeleccion.hora"> · {{ proximoPartidoSeleccion.hora }}</template><template v-else> · Hora por confirmar</template></time>
              <a :href="proximoPartidoSeleccion.fuenteUrl" target="_blank" rel="noopener noreferrer">Consultar fuente oficial <span aria-hidden="true">↗</span></a>
            </template>
            <p v-else class="home-sin-datos">La FCF aún no publica una nueva fecha para la Selección.</p>
            <div v-if="convocatoriaVigente" class="home-convocatoria">
              <span>Convocatoria vigente · {{ convocatoriaVigente.etiqueta }}</span>
              <a :href="convocatoriaVigente.actualizacionUrl || convocatoriaVigente.fuenteUrl" target="_blank" rel="noopener noreferrer">{{ convocatoriaVigente.cantidad }} convocados · publicada {{ fechaPublicaPortada(convocatoriaVigente.publicadaEn) }} <span aria-hidden="true">↗</span></a>
              <small>Información oficial consultada {{ fechaPublicaPortada(fechaVerificacionSeleccion) }}.</small>
            </div>
          </article>
          <div v-if="noticiasSeleccionPortada.length" class="home-noticias-modulo home-noticias-seleccion">
            <TarjetaArticuloPortada v-for="articulo in noticiasSeleccionPortada" :key="articulo.slug" :articulo="articulo" />
          </div>
          <div v-else class="home-panel home-seleccion-sin-noticias">
            <h3>Noticias de la Selección</h3>
            <p>En este momento no hay una noticia editorial reciente atribuible con claridad a la Selección. Consulta la agenda y las publicaciones oficiales.</p>
            <NuxtLink to="/seleccion-colombia">Abrir el hub de la Selección <span aria-hidden="true">→</span></NuxtLink>
          </div>
        </div>
      </section>

      <section class="medio-seccion home-bloque-tematico home-europa" aria-labelledby="titulo-europa-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">FÚTBOL INTERNACIONAL</p><h2 id="titulo-europa-home">Colombianos en Europa</h2><p>Actualidad editorial y perfiles verificados, sin estadísticas inventadas.</p></div>
          <NuxtLink to="/colombianos-en-europa">Ver todos <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <nav class="home-perfiles-europa" aria-label="Perfiles verificados de futbolistas colombianos">
          <NuxtLink v-for="jugador in perfilesEuropaPortada" :key="jugador.slug" :to="`/jugadores/${encodeURIComponent(jugador.slug)}`">
            <span>{{ jugador.nombre.slice(0, 1) }}</span><strong>{{ jugador.nombre }}</strong><small>{{ jugador.club }} · {{ jugador.competencia }}</small>
          </NuxtLink>
        </nav>
        <div v-if="noticiasEuropaPortada.length" class="home-noticias-modulo home-noticias-europa">
          <TarjetaArticuloPortada v-for="articulo in noticiasEuropaPortada" :key="articulo.slug" :articulo="articulo" />
        </div>
        <p v-else class="home-sin-datos home-sin-datos-contenido">No hay noticias recientes vinculadas de forma verificable con estos futbolistas.</p>
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
        v-if="seguimientoCompeticionesHidratado && competicionesSeguidas.length"
        class="medio-seccion medio-seguimiento-competiciones"
        aria-labelledby="titulo-competiciones-seguidas"
      >
        <div class="medio-encabezado">
          <div>
            <h2 id="titulo-competiciones-seguidas">Tus competiciones</h2>
            <p>Marcadores y próximos partidos de los torneos que sigues.</p>
          </div>
          <NuxtLink to="/liga-colombiana">Explorar fútbol colombiano <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <p v-if="cargandoCompeticionesSeguidas && !actualidadCompeticionesSeguidas.length" class="estado-seguimiento-home" role="status">Cargando tus competiciones…</p>
        <div v-else-if="actualidadCompeticionesSeguidas.length" class="grilla-competiciones-seguidas-home">
          <article v-for="competicion in actualidadCompeticionesSeguidas" :key="competicion.slug" class="tarjeta-competicion-seguida-home">
            <header>
              <div>
                <span class="etiqueta-competicion-seguida-home">FÚTBOL COLOMBIANO</span>
                <NuxtLink class="nombre-competicion-seguida-home" :to="`/competiciones/${competicion.slug}`">{{ competicion.nombre }}</NuxtLink>
              </div>
              <BotonSeguirCompeticion compacto :slug="competicion.slug" :nombre="competicion.nombre" />
            </header>
            <p v-if="competicion.partidoEnVivo" class="partido-competicion-seguida-home en-vivo">
              <span>EN VIVO</span>
              <NuxtLink :to="`/partidos/${encodeURIComponent(competicion.partidoEnVivo.slug)}`">{{ competicion.partidoEnVivo.local }} {{ competicion.partidoEnVivo.golesLocal ?? '—' }}–{{ competicion.partidoEnVivo.golesVisitante ?? '—' }} {{ competicion.partidoEnVivo.visitante }}</NuxtLink>
            </p>
            <p v-else-if="competicion.proximoPartido" class="partido-competicion-seguida-home">
              <span>PRÓXIMO · {{ fechaEquipoSeguido(competicion.proximoPartido.fechaIso) }}</span>
              <NuxtLink :to="`/partidos/${encodeURIComponent(competicion.proximoPartido.slug)}`">{{ competicion.proximoPartido.local }} vs {{ competicion.proximoPartido.visitante }}</NuxtLink>
            </p>
            <p v-else-if="competicion.resultadoReciente" class="partido-competicion-seguida-home">
              <span>RESULTADO RECIENTE</span>
              <NuxtLink :to="`/partidos/${encodeURIComponent(competicion.resultadoReciente.slug)}`">{{ competicion.resultadoReciente.local }} {{ competicion.resultadoReciente.golesLocal ?? '—' }}–{{ competicion.resultadoReciente.golesVisitante ?? '—' }} {{ competicion.resultadoReciente.visitante }}</NuxtLink>
            </p>
            <p v-else class="estado-seguimiento-home">
              {{ competicion.error ? 'No fue posible cargar el calendario ahora.' : 'No hay partidos públicos confirmados para mostrar.' }}
            </p>
            <NuxtLink class="enlace-competicion-seguida-home" :to="`/competiciones/${competicion.slug}`">Ver calendario, tabla y noticias <span aria-hidden="true">→</span></NuxtLink>
          </article>
        </div>
        <p v-else class="estado-seguimiento-home">No fue posible cargar tus competiciones ahora. Puedes volver a sus fichas para consultar el calendario.</p>
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

      <section v-if="noticiaAnalisis" class="medio-seccion home-analisis" aria-labelledby="titulo-analisis-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">CONTEXTO Y ANÁLISIS</p><h2 id="titulo-analisis-home">Para entender el juego</h2><p>Historias y explicadores publicados por el equipo editorial.</p></div>
          <NuxtLink to="/especiales">Más especiales <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="home-analisis-tarjeta"><TarjetaArticuloPortada :articulo="noticiaAnalisis" /></div>
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
.medio-apertura { display: grid; grid-template-columns: minmax(235px, .82fr) minmax(0, 1.28fr) minmax(0, .82fr); gap: 16px; align-items: stretch; }
.medio-apertura.sin-secundarias { grid-template-columns: minmax(220px, .72fr) minmax(0, 1.28fr); }
.medio-introduccion { min-width: 0; align-self: center; padding: 12px 8px 12px 0; }
.medio-introduccion h1 { margin: 8px 0 12px; color: #f5f8ff; font-size: clamp(1.8rem, 2.8vw, 2.65rem); font-weight: 850; line-height: 1.06; letter-spacing: -.045em; text-wrap: balance; }
.medio-introduccion > p:last-child { margin: 0; color: #a8bbd5; font-size: clamp(.86rem, 1.05vw, .98rem); line-height: 1.55; }
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
.medio-seguimiento-competiciones { border: 1px solid #294467; border-radius: 12px; background: #0c2443; padding: 20px; }
.medio-seguimiento-competiciones > .medio-encabezado { margin-bottom: 16px; }
.medio-seguimiento-competiciones > .medio-encabezado p { margin: 5px 0 0; color: #a8bbd5; font-size: .8rem; }
.grilla-competiciones-seguidas-home { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 12px; }
.tarjeta-competicion-seguida-home { min-width: 0; border: 1px solid #294467; border-radius: 10px; background: #07182f; padding: 14px; }
.tarjeta-competicion-seguida-home > header { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }
.tarjeta-competicion-seguida-home > header > div { display: grid; min-width: 0; gap: 4px; }
.etiqueta-competicion-seguida-home { color: #a8bbd5; font-size: .62rem; font-weight: 800; letter-spacing: .06em; }
.nombre-competicion-seguida-home { color: #fff; font-size: .98rem; font-weight: 800; text-decoration: none; }
.nombre-competicion-seguida-home:hover, .enlace-competicion-seguida-home:hover { color: #ffd800; }
.tarjeta-competicion-seguida-home :deep(.boton-seguimiento-competicion) { min-height: 32px; padding: 5px 9px; }
.partido-competicion-seguida-home { display: grid; gap: 5px; margin: 14px 0 0; border-top: 1px solid #294467; padding-top: 12px; }
.partido-competicion-seguida-home > span { color: #9bc8ff; font-size: .63rem; font-weight: 850; letter-spacing: .06em; }
.partido-competicion-seguida-home.en-vivo > span { color: #ff8f98; }
.partido-competicion-seguida-home a { color: #e7edf6; font-size: .8rem; font-weight: 650; line-height: 1.45; }
.partido-competicion-seguida-home a:hover { color: #ffd800; }
.enlace-competicion-seguida-home { display: inline-flex; justify-content: space-between; gap: 12px; width: 100%; margin-top: 12px; border-top: 1px solid #294467; padding-top: 11px; color: #9bc8ff; font-size: .76rem; font-weight: 700; text-decoration: none; }
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
.medio-vacio h2 { margin: 0; color: #f5f8ff; font-size: 2rem; }
.home-bloque-tematico, .home-jornada, .home-analisis { margin-top: clamp(30px, 4vw, 48px); }
.home-encabezado-seccion { align-items: center; margin-bottom: 16px; }
.home-encabezado-seccion > div { min-width: 0; }
.home-encabezado-seccion p:not(.home-antetitulo) { margin: 5px 0 0; color: #a8bbd5; font-size: .8rem; line-height: 1.45; }
.home-encabezado-seccion .home-antetitulo { margin: 0 0 4px; color: #7ce6f5; font-size: .62rem; font-weight: 900; letter-spacing: .12em; }
.home-jornada-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, .9fr); gap: 14px; }
.home-panel { min-width: 0; border: 1px solid #294467; border-radius: 12px; background: #0c2443; padding: 18px; }
.home-encabezado-panel { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.home-encabezado-panel h3 { margin: 0; color: #fff; font-size: 1rem; letter-spacing: -.02em; }
.home-encabezado-panel > a, .home-encabezado-panel > span { color: #9bc8ff; font-size: .7rem; font-weight: 750; text-decoration: none; }
.home-encabezado-panel > a:hover, .home-enlace-panel:hover { color: #ffd800; }
.home-lista-partidos, .home-lista-resultados { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.home-lista-partidos li, .home-lista-resultados li { min-width: 0; border: 1px solid #294467; border-radius: 9px; background: #07182f; }
.home-partido-link, .home-resultado-link { display: grid; gap: 8px; min-width: 0; padding: 11px; color: #e7edf6; text-decoration: none; }
.home-partido-link:hover, .home-resultado-link:hover { border-color: #7ce6f5; }
.home-partido-meta, .home-resultado-meta { display: flex; justify-content: space-between; gap: 10px; color: #9eafc8; font-size: .62rem; font-weight: 800; }
.home-partido-meta > :first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-partido-meta > :last-child { flex-shrink: 0; color: #a9c9ee; }
.home-partido-meta .home-estado-vivo { color: #ff8f98; }
.home-equipos-partido { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 10px; align-items: center; }
.home-equipos-partido > span { display: flex; min-width: 0; align-items: center; gap: 7px; }
.home-equipos-partido > span:last-child { justify-content: flex-end; }
.home-equipos-partido strong { overflow: hidden; color: #fff; font-size: .77rem; text-overflow: ellipsis; white-space: nowrap; }
.home-equipos-partido > b { color: #ffd800; font-size: .8rem; white-space: nowrap; }
.home-partido-link time { color: #a8bbd5; font-size: .67rem; }
.home-resultado-meta { display: block; }
.home-equipos-resultado { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: center; }
.home-equipos-resultado > span { display: flex; min-width: 0; align-items: center; gap: 6px; color: #e7edf6; font-size: .72rem; font-weight: 650; }
.home-equipos-resultado > span:last-child { justify-content: flex-end; text-align: right; }
.home-equipos-resultado > span img, .home-equipos-resultado > span b { flex: 0 0 26px; width: 26px; height: 26px; object-fit: contain; }
.home-equipos-resultado > span b { display: grid; place-items: center; border-radius: 50%; background: #173657; color: #fff; }
.home-equipos-resultado > span { overflow-wrap: anywhere; }
.home-equipos-resultado > strong { color: #ffd800; font-size: .95rem; white-space: nowrap; }
.home-sin-datos { margin: 4px 0 0; color: #a8bbd5; font-size: .8rem; line-height: 1.5; }
.home-liga-grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 14px; align-items: start; }
.home-tabla-panel { padding-bottom: 12px; }
.home-tabla-titulo { align-items: start; }
.home-tabla-titulo p { margin: 0 0 3px; color: #9bc8ff; font-size: .64rem; font-weight: 800; }
.home-tabla-titulo time { color: #a8bbd5; font-size: .62rem; text-align: right; }
.home-tabla-scroll { overflow-x: auto; }
.home-tabla { width: 100%; border-collapse: collapse; color: #dce7f5; font-size: .76rem; text-align: left; }
.home-tabla th, .home-tabla td { border-bottom: 1px solid #294467; padding: 8px 6px; }
.home-tabla thead { color: #9eafc8; font-size: .63rem; text-transform: uppercase; }
.home-tabla tbody > tr > td:first-child { width: 42px; color: #ffd800; font-weight: 900; }
.home-tabla tbody > tr > td:last-child { width: 44px; color: #fff; text-align: right; }
.home-equipo-tabla { display: flex; min-width: 150px; align-items: center; gap: 8px; }
.home-equipo-tabla img, .home-equipo-tabla > b { flex: 0 0 27px; width: 27px; height: 27px; object-fit: contain; }
.home-equipo-tabla > b { display: grid; place-items: center; border-radius: 50%; background: #173657; color: #fff; }
.home-equipo-tabla a { overflow: hidden; color: #e7edf6; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.home-enlace-panel { display: inline-flex; justify-content: space-between; width: 100%; margin-top: 10px; color: #9bc8ff; font-size: .72rem; font-weight: 750; text-decoration: none; }
.home-columna-liga { display: grid; gap: 12px; }
.home-proximo-link { display: grid; gap: 9px; color: #e7edf6; text-decoration: none; }
.home-proximo-link > span { color: #7ce6f5; font-size: .63rem; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; }
.home-proximo-link strong { color: #fff; font-size: 1.12rem; line-height: 1.35; }
.home-proximo-link strong small { color: #ffd800; font-size: .8rem; }
.home-proximo-link time { color: #a8bbd5; font-size: .72rem; }
.home-proximo-link:hover strong { color: #ffd800; }
.home-noticias-modulo { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.home-noticias-seleccion { grid-template-columns: 1fr; }
.home-seleccion-grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 14px; align-items: start; }
.home-seleccion-agenda { display: grid; gap: 11px; }
.home-seleccion-agenda > p { margin: 0; color: #9bc8ff; font-size: .72rem; font-weight: 700; }
.home-seleccion-agenda > strong { color: #fff; font-size: clamp(1.2rem, 2.2vw, 1.65rem); line-height: 1.25; }
.home-seleccion-agenda > strong small { color: #ffd800; font-size: .8rem; }
.home-seleccion-agenda > time { color: #dce7f5; font-size: .8rem; line-height: 1.45; }
.home-seleccion-agenda > a, .home-seleccion-sin-noticias > a { color: #9bc8ff; font-size: .72rem; font-weight: 750; text-decoration: none; }
.home-seleccion-agenda > a:hover, .home-seleccion-sin-noticias > a:hover { color: #ffd800; }
.home-convocatoria { display: grid; gap: 5px; margin-top: 5px; border-top: 1px solid #294467; padding-top: 12px; }
.home-convocatoria > span { color: #7ce6f5; font-size: .64rem; font-weight: 850; text-transform: uppercase; }
.home-convocatoria > a { color: #e7edf6; font-size: .73rem; line-height: 1.4; text-decoration: none; }
.home-convocatoria > a:hover { color: #ffd800; }
.home-convocatoria small { color: #a8bbd5; font-size: .64rem; }
.home-seleccion-sin-noticias { display: grid; align-content: center; gap: 10px; }
.home-seleccion-sin-noticias h3 { margin: 0; color: #fff; font-size: 1rem; }
.home-seleccion-sin-noticias p { margin: 0; color: #a8bbd5; font-size: .8rem; line-height: 1.5; }
.home-perfiles-europa { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.home-perfiles-europa a { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 2px 9px; align-items: center; min-width: 0; border: 1px solid #294467; border-radius: 9px; background: #0c2443; padding: 10px; text-decoration: none; }
.home-perfiles-europa a:hover { border-color: #7ce6f5; }
.home-perfiles-europa a > span { display: grid; width: 32px; height: 32px; grid-row: span 2; place-items: center; border-radius: 50%; background: #173657; color: #ffd800; font-weight: 900; }
.home-perfiles-europa strong { overflow: hidden; color: #fff; font-size: .74rem; text-overflow: ellipsis; white-space: nowrap; }
.home-perfiles-europa small { overflow: hidden; color: #a8bbd5; font-size: .61rem; text-overflow: ellipsis; white-space: nowrap; }
.home-noticias-europa { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.home-sin-datos-contenido { border: 1px solid #294467; border-radius: 10px; background: #0c2443; padding: 16px; }
.home-analisis-tarjeta { width: min(100%, 420px); }
.home-jornada :deep(.espacio-adsterra) { margin-top: 16px; }
.portada-medio a:focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 900px) {
  .medio-apertura { grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); }
  .medio-apertura.sin-secundarias { grid-template-columns: minmax(0, .84fr) minmax(0, 1.16fr); }
  .medio-secundarias { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .medio-actualidad { gap: 20px; }
  .medio-patrocinios { align-items: start; flex-direction: column; }
  .home-noticias-europa { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-perfiles-europa { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .medio-contenedor { width: calc(100% - 32px); }
  .medio-edicion { font-size: .55rem; letter-spacing: .07em; }
  .medio-apertura, .medio-apertura.sin-secundarias, .medio-actualidad { grid-template-columns: 1fr; }
  .medio-introduccion { padding: 8px 0 2px; }
  .medio-introduccion h1 { max-width: 19ch; margin: 7px 0 9px; font-size: clamp(1.8rem, 7.6vw, 2.2rem); }
  .medio-introduccion > p:last-child { max-width: 54ch; font-size: .9rem; }
  .grilla-equipos-seguidos-home { grid-template-columns: 1fr; }
  .grilla-competiciones-seguidas-home { grid-template-columns: 1fr; }
  .medio-secundarias { grid-column: auto; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .medio-secundarias :deep(.noticia-portada.con-imagen:not(.principal)) { grid-template-columns: 1fr; grid-template-rows: auto 1fr; align-content: start; }
  .medio-secundarias :deep(.noticia-portada:not(.principal) .foto) { min-height: 96px; }
  .medio-secundarias :deep(.noticia-portada:not(.principal) .texto) { padding: 11px; }
  .medio-actualidad { margin-top: 24px; gap: 24px; }
  .medio-resultados { grid-template-columns: 1fr; }
  .medio-explora { align-items: start; flex-direction: column; gap: 12px; }
  .medio-encabezado a { font-size: .66rem; }
  .medio-patrocinios { padding: 18px; }
  .home-encabezado-seccion { align-items: flex-start; }
  .home-encabezado-seccion > a { max-width: 42%; white-space: normal; text-align: right; }
  .home-jornada-grid, .home-liga-grid, .home-seleccion-grid { grid-template-columns: 1fr; }
  .home-panel { padding: 15px; }
  .home-lista-partidos, .home-lista-resultados { grid-auto-columns: minmax(245px, 82vw); grid-auto-flow: column; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 5px; scroll-snap-type: x proximity; }
  .home-lista-partidos li, .home-lista-resultados li { scroll-snap-align: start; }
  .home-noticias-modulo, .home-noticias-europa { grid-auto-columns: minmax(245px, 82vw); grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 4px; scroll-snap-type: x proximity; }
  .home-noticias-modulo > * { scroll-snap-align: start; }
  .home-perfiles-europa { grid-auto-columns: minmax(220px, 72vw); grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 5px; }
  .home-perfiles-europa > * { scroll-snap-align: start; }
  .home-equipo-tabla { min-width: 125px; }
  .home-tabla-titulo { align-items: flex-start; }
  .home-tabla-titulo time { max-width: 44%; }
}
@media (max-width: 370px) {
  .medio-secundarias { grid-template-columns: 1fr; }
}
</style>
