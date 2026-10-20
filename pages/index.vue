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
  priorizarPartidosPortada,
  normalizarEspaciosFechaPortada,
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
const configuracionApi = useRuntimeConfig()
const urlWinPlay = 'https://winplay.co/plans'
const urlAnuncioVerEnVivo = computed(() => String(configuracionApi.public.adsterraMatchPromoUrls || '')
  .split(',')
  .map((valor) => {
    try {
      const url = new URL(valor.trim())
      return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
    } catch {
      return ''
    }
  })
  .find(Boolean) || '')
const claveClicVerEnVivo = 'pont3la10:clic-ver-en-vivo:v1'
let clicVerEnVivoEnMemoria = false
const claveClicFuenteSeleccion = 'pont3la10:clic-fuente-seleccion:v1'
let clicFuenteSeleccionEnMemoria = false
const urlApiPublica = (ruta: string) => import.meta.server && configuracionApi.public.apiOrigin
  ? `${String(configuracionApi.public.apiOrigin).replace(/\/$/, '')}${ruta}`
  : ruta
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
  consultaLigaArticulos, consultaSeleccionArticulos, consultaEuropaArticulos, consultaInternacionalArticulos] = await Promise.all([
  useFetch<RespuestaResultados>(urlApiPublica('/api/resultados'), {
    key: 'resultados-portada-futbol',
    query: { deporte: 'futbol', timeZone: zonaHorariaColombia },
    default: () => respuestaResultadosVacia,
    ignoreResponseError: true
  }),
  useFetch<RespuestaLigaPortada>(urlApiPublica('/api/liga-colombiana'), {
    key: 'liga-colombiana-portada',
    default: () => respuestaLigaVacia,
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>(urlApiPublica('/api/articulos'), {
    key: 'articulos-publicados-portada',
    query: { limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico | null>(urlApiPublica('/api/articulos/destacada'), {
    key: 'articulo-destacado-portada',
    default: () => null,
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>(urlApiPublica('/api/articulos'), {
    key: 'articulos-liga-betplay-portada',
    query: { tema: 'liga-betplay', limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>(urlApiPublica('/api/articulos'), {
    key: 'articulos-seleccion-colombia-portada',
    query: { tema: 'seleccion-colombia', limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>(urlApiPublica('/api/articulos'), {
    key: 'articulos-colombianos-europa-portada',
    query: { tema: 'colombianos-en-europa', limite: 8 },
    default: () => [],
    ignoreResponseError: true
  }),
  useFetch<ResumenArticuloPublico[]>(urlApiPublica('/api/articulos'), {
    key: 'articulos-internacionales-portada',
    query: { categoria: 'futbol-mundial', limite: 10 },
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
const noticiasInternacionales = computed(() => (Array.isArray(consultaInternacionalArticulos.data.value)
  ? consultaInternacionalArticulos.data.value.filter(esResumenArticuloPublico)
  : []).map(mapearArticuloPortada))
const noticiasInternacionalesPorPagina = 3
const paginaNoticiasInternacionales = ref(0)
const totalPaginasNoticiasInternacionales = computed(() =>
  Math.ceil(noticiasInternacionales.value.length / noticiasInternacionalesPorPagina)
)
const noticiasPaginaInternacionales = computed(() => {
  const inicio = paginaNoticiasInternacionales.value * noticiasInternacionalesPorPagina
  return noticiasInternacionales.value.slice(inicio, inicio + noticiasInternacionalesPorPagina)
})
function cambiarPaginaNoticiasInternacionales(cambio: number) {
  const ultimaPagina = Math.max(0, totalPaginasNoticiasInternacionales.value - 1)
  paginaNoticiasInternacionales.value = Math.min(
    ultimaPagina,
    Math.max(0, paginaNoticiasInternacionales.value + cambio)
  )
}
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
  .slice(0, 4)
)
const slugsSecundariasAmpliadas = computed(() => new Set(
  noticiasSecundarias.value.slice(2).map(articulo => articulo.slug)
))
const slugsApertura = computed(() => new Set([
  portadaPrincipal.value?.slug,
  ...noticiasSecundarias.value.slice(0, 2).map(articulo => articulo.slug)
].filter((slug): slug is string => Boolean(slug))))
const ultimasNoticias = computed(() => articulosPublicados.value
  .filter(articulo => !slugsApertura.value.has(articulo.slug))
)
const partidosLiga = computed(() => (datosLiga.value?.partidos || []).filter(partido =>
  ['liga-betplay', 'torneo-betplay', 'copa-colombia'].includes(partido.competencia)
))
const tablaLiga = computed(() => (datosLiga.value?.tabla || [])
  .filter(fila => fila.competencia === 'liga-betplay')
)
const partidoLigaDestacado = computed(() => obtenerProximoPartidoLiga(partidosLiga.value, instantePortada.value))
const resultadosLigaRecientes = computed(() => obtenerResultadosLigaRecientes(partidosLiga.value, instantePortada.value, 3))
const jornadaPortada = computed(() => separarJornadaPortada(
  Array.isArray(resultados.value?.partidos) ? resultados.value.partidos : [],
  instantePortada.value
))
const partidosHoyPortada = computed(() => priorizarPartidosPortada(jornadaPortada.value.partidos).slice(0, 5))
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
  return filtrarNoticiasLiga(respuesta, equipos, 4).map(mapearArticuloPortada)
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
const perfilesEuropaPortada = computed(() => jugadoresColombianosEuropa)
const fechaHoyPortada = computed(() => obtenerFechaEnZonaHoraria(new Date(instantePortada.value)))
const proximoPartidoSeleccion = computed(() => calendarioOficialSeleccion
  .filter(partido => partido.fecha >= fechaHoyPortada.value)
  .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null
)
const convocatoriaVigente = computed(() => convocatoriasOficialesSeleccion
  .filter(convocatoria => convocatoria.vigenteHasta >= fechaHoyPortada.value)
  .sort((a, b) => b.publicadaEn.localeCompare(a.publicadaEn))[0] || null
)
const ultimaConvocatoriaSeleccion = computed(() => [...convocatoriasOficialesSeleccion]
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
  return normalizarEspaciosFechaPortada(new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(valor)))
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
  return normalizarEspaciosFechaPortada(new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: zonaHorariaColombia
  }).format(new Date(fecha)))
}

function registrarClicVerEnVivo(evento: MouseEvent) {
  if (!import.meta.client || evento.button !== 0
    || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return

  const enlace = evento.currentTarget
  if (!(enlace instanceof HTMLAnchorElement)) return

  let primerClic = !clicVerEnVivoEnMemoria
  try {
    primerClic = window.sessionStorage.getItem(claveClicVerEnVivo) !== '1'
    window.sessionStorage.setItem(claveClicVerEnVivo, '1')
  } catch {
    clicVerEnVivoEnMemoria = true
  }
  clicVerEnVivoEnMemoria = true

  const destinoAnuncio = primerClic ? urlAnuncioVerEnVivo.value : ''
  enlace.href = destinoAnuncio || urlWinPlay
  enlace.rel = destinoAnuncio
    ? 'sponsored nofollow noopener noreferrer'
    : 'noopener noreferrer'
}

function registrarClicFuenteSeleccion(evento: MouseEvent) {
  if (!import.meta.client || evento.button !== 0
    || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey
    || !urlAnuncioVerEnVivo.value) return

  const enlace = evento.currentTarget
  if (!(enlace instanceof HTMLAnchorElement)) return

  const destinoOficial = enlace.dataset.destinoOficial || enlace.href
  enlace.dataset.destinoOficial = destinoOficial

  let primerClic = !clicFuenteSeleccionEnMemoria
  try {
    primerClic = window.sessionStorage.getItem(claveClicFuenteSeleccion) !== '1'
    window.sessionStorage.setItem(claveClicFuenteSeleccion, '1')
  } catch {
    clicFuenteSeleccionEnMemoria = true
  }
  clicFuenteSeleccionEnMemoria = true

  const destinoAnuncio = primerClic ? urlAnuncioVerEnVivo.value : ''
  enlace.href = destinoAnuncio || destinoOficial
  enlace.rel = destinoAnuncio
    ? 'sponsored nofollow noopener noreferrer'
    : 'noopener noreferrer'
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
  const fechaSegura = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00.000Z` : fecha
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeZone: zonaHorariaColombia
  }).format(new Date(fechaSegura))
}

function codigoPaisSeleccion(nombre: string) {
  const normalizado = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalizado.includes('colombia')) return 'colombia'
  if (normalizado.includes('chile')) return 'chile'
  return 'otro'
}

function inicialesPaisSeleccion(nombre: string) {
  return nombre.trim().slice(0, 3).toLocaleUpperCase('es-CO')
}

const horasPublicacion = computed(() => new Map(
  publicacionesReales.value.map(articulo => [articulo.slug, obtenerHoraPublicacion(articulo.publicadoEn)])
))

useSeoPont3la10({
  titulo: 'Fútbol colombiano: noticias, partidos y resultados | Pont3la10',
  descripcion: 'Noticias de fútbol colombiano, Selección Colombia y Liga BetPlay. Consulta partidos de hoy, resultados, tabla de posiciones y fútbol internacional en Pont3la10.',
  rutaCanonica: '/',
  imagenAlt: 'Pont3la10, la jugada clara',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Noticias de fútbol colombiano y Selección Colombia',
    description: 'Liga BetPlay, Selección Colombia, fútbol internacional, partidos de hoy, resultados y actualidad deportiva.',
    inLanguage: 'es-CO'
  }
})
</script>

<template>
  <div class="portada-medio">
    <div class="medio-contenedor">
      <div class="medio-edicion"><span>LA JUGADA CLARA</span><span>Fútbol colombiano · Actualidad deportiva</span></div>
      <section class="medio-apertura" :class="{ 'sin-secundarias': !noticiasSecundarias.length }" aria-labelledby="titulo-portada-home">
        <div class="medio-introduccion">
          <p class="home-antetitulo">LA JUGADA CLARA · FÚTBOL COLOMBIANO</p>
          <h1 id="titulo-portada-home">Noticias de fútbol colombiano y Selección Colombia</h1>
          <p>Liga BetPlay, Selección Colombia, fútbol internacional, partidos de hoy, resultados y actualidad deportiva.</p>
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

      <EsqueletoResultados v-if="estadoResultados === 'pending'" tipo="franja" />
      <FranjaMarcadores v-else-if="partidosFranja.length" :partidos="partidosFranja" destino="/partidos-hoy" />

      <section class="medio-seccion home-jornada" aria-labelledby="titulo-jornada-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">FÚTBOL DE HOY</p><h2 id="titulo-jornada-home">Tu jornada</h2><p>Partidos y marcadores confirmados · hora de Colombia</p></div>
          <NuxtLink to="/partidos-hoy">Ver partidos de hoy <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="home-jornada-grid">
          <section class="home-panel" aria-labelledby="titulo-partidos-hoy-home">
            <div class="home-encabezado-panel"><h3 id="titulo-partidos-hoy-home">Partidos de hoy</h3><NuxtLink to="/partidos-hoy">Ver agenda</NuxtLink></div>
            <ul v-if="partidosHoyPortada.length" class="home-lista-partidos">
              <li v-for="partido in partidosHoyPortada" :key="partido.id">
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
            <div class="home-encabezado-panel"><h3 id="titulo-resultados-recientes-home">Resultados de fútbol</h3><NuxtLink to="/resultados/futbol">Todos los resultados de fútbol</NuxtLink></div>
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
          <NuxtLink to="/liga-colombiana">Noticias y calendario de Liga BetPlay <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="home-liga-grid">
          <section class="home-panel home-tabla-panel" aria-labelledby="titulo-tabla-home">
            <div class="home-encabezado-panel home-tabla-titulo">
              <div><p>{{ tablaLiga[0]?.temporada || 'Liga BetPlay' }}<template v-if="tablaLiga[0]?.fase"> · {{ tablaLiga[0].fase }}</template></p><h3 id="titulo-tabla-home">Tabla de posiciones</h3></div>
            </div>
            <div v-if="tablaLiga.length" class="home-tabla-scroll">
              <table class="home-tabla">
                <caption class="solo-lectores-pantalla">Tabla completa verificada de la Liga BetPlay</caption>
                <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">Pts</th></tr></thead>
                <tbody>
                  <tr v-for="fila in tablaLiga" :key="fila.equipoClave">
                    <td>{{ fila.posicion }}</td>
                    <th scope="row"><span class="home-equipo-tabla"><EscudoEquipoPublico v-if="fila.escudo" :src="fila.escudo" :alt="`Escudo de ${fila.equipo}`" :width="27" :height="27" sizes="27px" loading="lazy" /><b v-else aria-hidden="true">{{ fila.equipo.slice(0, 1) }}</b><NuxtLink v-if="fila.equipoClave" :to="`/equipos/${encodeURIComponent(fila.equipoClave)}`">{{ fila.equipo }}</NuxtLink><span v-else>{{ fila.equipo }}</span></span></th>
                    <td><strong>{{ fila.puntos }}</strong></td>
                  </tr>
                </tbody>
              </table>
              <NuxtLink class="home-enlace-panel" to="/liga-colombiana#posiciones">Ver tabla de la Liga BetPlay <span aria-hidden="true">→</span></NuxtLink>
            </div>
            <p v-else class="home-sin-datos">La tabla oficial todavía no está disponible en los datos públicos.</p>
          </section>

          <div class="home-columna-liga">
            <article class="home-panel home-proximo-partido">
              <div class="home-encabezado-panel home-proximo-encabezado">
                <h3>{{ partidoLigaDestacado && /live|en.?vivo|in.?play/i.test(partidoLigaDestacado.estado) ? 'En juego' : 'Próximo partido' }}</h3>
                <NuxtLink to="/liga-colombiana#partidos" class="home-calendario-link">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="5" width="13" height="12" rx="2" /><path d="M6.5 3v4M13.5 3v4M3.5 8.5h13" /></svg>
                  Calendario
                </NuxtLink>
              </div>
              <div v-if="partidoLigaDestacado" class="home-proximo-partido-detalle">
                <NuxtLink :to="`/partidos/${encodeURIComponent(partidoLigaDestacado.slug)}`" class="home-proximo-link">
                  <span class="home-proximo-competencia">
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5h8v3a4 4 0 0 1-8 0v-3ZM6 5H3.5v1.2A3.3 3.3 0 0 0 6.7 9.5M14 5h2.5v1.2a3.3 3.3 0 0 1-3.2 3.3M10 10.5v3m-3 3h6m-5-3h4l1 3H8l1-3Z" /></svg>
                    {{ partidoLigaDestacado.competencia === 'torneo-betplay' ? 'Torneo BetPlay' : partidoLigaDestacado.competencia === 'copa-colombia' ? 'Copa Colombia' : 'Liga BetPlay' }}
                  </span>
                  <div class="home-proximo-enfrentamiento">
                    <div class="home-proximo-equipo">
                      <span class="home-proximo-escudo">
                        <EscudoEquipoPublico v-if="partidoLigaDestacado.escudoLocal" :src="partidoLigaDestacado.escudoLocal" alt="" :width="54" :height="54" sizes="54px" loading="lazy" />
                        <span v-else class="home-proximo-inicial" aria-hidden="true">{{ partidoLigaDestacado.local.slice(0, 1) }}</span>
                      </span>
                      <strong>{{ partidoLigaDestacado.local }}</strong>
                    </div>
                    <span class="home-proximo-centro" :class="{ 'home-proximo-en-vivo': /live|en.?vivo|in.?play/i.test(partidoLigaDestacado.estado) }">
                      <template v-if="/live|en.?vivo|in.?play/i.test(partidoLigaDestacado.estado)">{{ partidoLigaDestacado.golesLocal ?? '—' }}–{{ partidoLigaDestacado.golesVisitante ?? '—' }}</template>
                      <template v-else>vs</template>
                    </span>
                    <div class="home-proximo-equipo">
                      <span class="home-proximo-escudo">
                        <EscudoEquipoPublico v-if="partidoLigaDestacado.escudoVisitante" :src="partidoLigaDestacado.escudoVisitante" alt="" :width="54" :height="54" sizes="54px" loading="lazy" />
                        <span v-else class="home-proximo-inicial" aria-hidden="true">{{ partidoLigaDestacado.visitante.slice(0, 1) }}</span>
                      </span>
                      <strong>{{ partidoLigaDestacado.visitante }}</strong>
                    </div>
                  </div>
                  <div class="home-proximo-pie">
                    <time :datetime="partidoLigaDestacado.fechaIso"><span>{{ fechaPartidoPortada(partidoLigaDestacado.fechaIso) }}</span><b>{{ horaPartidoPortada(partidoLigaDestacado.fechaIso) }}</b></time>
                    <span class="home-proximo-accion">Ver partido <span aria-hidden="true">→</span></span>
                  </div>
                </NuxtLink>
                <a
                  :href="urlWinPlay"
                  class="home-ver-en-vivo"
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerpolicy="no-referrer"
                  aria-label="Ver en vivo en Win Play. El primer clic abre un anuncio patrocinado."
                  @click="registrarClicVerEnVivo"
                >
                  <img class="home-ver-en-vivo-imagen" src="/images/ui/boton-ver-en-vivo.webp" alt="" aria-hidden="true" width="900" height="300" loading="lazy">
                  <span class="home-ver-en-vivo-contenido">
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4.5v11l9-5.5-9-5.5Z" /></svg>
                    <span>Ver en vivo</span>
                  </span>
                </a>
                <p class="home-ver-en-vivo-aviso">El primer clic abre un anuncio patrocinado; luego te lleva a Win Play.</p>
              </div>
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
          <div>
            <p class="home-antetitulo">FÚTBOL DE SELECCIONES</p>
            <h2 id="titulo-seleccion-home">Selección Colombia</h2>
            <p>Fuente: calendario y publicaciones oficiales de la FCF · revisión manual: {{ fechaPublicaPortada(fechaVerificacionSeleccion) }}.</p>
          </div>
          <a class="home-seleccion-fuente" href="https://fcf.com.co/calendario/" target="_blank" rel="noopener noreferrer" @click="registrarClicFuenteSeleccion">
            Calendario oficial FCF <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div class="home-seleccion-grid">
          <article class="home-seleccion-partido">
            <div class="home-seleccion-partido-cabecera">
              <div>
                <span class="home-seleccion-etiqueta">Próximo partido</span>
                <strong>{{ proximoPartidoSeleccion?.seleccion || 'Selecciones mayores' }}</strong>
              </div>
              <span class="home-seleccion-competicion">{{ proximoPartidoSeleccion?.competencia || 'Calendario FCF' }}</span>
            </div>
            <template v-if="proximoPartidoSeleccion">
              <div class="home-seleccion-duelo">
                <div class="home-seleccion-equipo">
                  <span v-if="codigoPaisSeleccion(proximoPartidoSeleccion.local) === 'colombia'" class="home-seleccion-bandera home-bandera-colombia" role="img" aria-label="Bandera de Colombia">
                    <span /><span /><span />
                  </span>
                  <span v-else-if="codigoPaisSeleccion(proximoPartidoSeleccion.local) === 'chile'" class="home-seleccion-bandera home-bandera-chile" role="img" aria-label="Bandera de Chile">
                    <span class="home-bandera-chile-blanco" /><span class="home-bandera-chile-rojo" /><span class="home-bandera-chile-azul" aria-hidden="true">★</span>
                  </span>
                  <span v-else class="home-seleccion-bandera home-bandera-fallback" aria-hidden="true">{{ inicialesPaisSeleccion(proximoPartidoSeleccion.local) }}</span>
                  <strong>{{ proximoPartidoSeleccion.local }}</strong>
                  <small>Local</small>
                </div>
                <span class="home-seleccion-vs" aria-label="contra">vs</span>
                <div class="home-seleccion-equipo">
                  <span v-if="codigoPaisSeleccion(proximoPartidoSeleccion.visitante) === 'colombia'" class="home-seleccion-bandera home-bandera-colombia" role="img" aria-label="Bandera de Colombia">
                    <span /><span /><span />
                  </span>
                  <span v-else-if="codigoPaisSeleccion(proximoPartidoSeleccion.visitante) === 'chile'" class="home-seleccion-bandera home-bandera-chile" role="img" aria-label="Bandera de Chile">
                    <span class="home-bandera-chile-blanco" /><span class="home-bandera-chile-rojo" /><span class="home-bandera-chile-azul" aria-hidden="true">★</span>
                  </span>
                  <span v-else class="home-seleccion-bandera home-bandera-fallback" aria-hidden="true">{{ inicialesPaisSeleccion(proximoPartidoSeleccion.visitante) }}</span>
                  <strong>{{ proximoPartidoSeleccion.visitante }}</strong>
                  <small>Visitante</small>
                </div>
              </div>
              <div class="home-seleccion-detalles">
                <div class="home-seleccion-detalle">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 17H5V9h14v10ZM5 7V6h2v1h2V6h6v1h2V6h2v1H5Z"/></svg>
                  <span><strong><time :datetime="proximoPartidoSeleccion.fechaIso || proximoPartidoSeleccion.fecha">{{ fechaSeleccionPortada(proximoPartidoSeleccion.fecha) }}</time></strong><small>{{ proximoPartidoSeleccion.hora || 'Hora por confirmar por la FCF' }}</small></span>
                </div>
                <div class="home-seleccion-detalle">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>
                  <span><strong>{{ proximoPartidoSeleccion.estadio || 'Sede por confirmar' }}</strong><small>{{ proximoPartidoSeleccion.sede || 'La FCF actualizará la sede' }}</small></span>
                </div>
              </div>
              <a class="home-seleccion-enlace-oficial" :href="proximoPartidoSeleccion.fuenteUrl" target="_blank" rel="noopener noreferrer" @click="registrarClicFuenteSeleccion">
                Ver anuncio oficial de la FCF <span aria-hidden="true">↗</span>
              </a>
            </template>
            <p v-else class="home-seleccion-sin-partido">La FCF aún no publica una nueva fecha para la Selección.</p>
          </article>
          <div class="home-seleccion-lateral">
            <section class="home-seleccion-noticias" aria-labelledby="titulo-noticias-seleccion-home">
              <div class="home-seleccion-subcabecera">
                <div><span>Redacción Pont3la10</span><h3 id="titulo-noticias-seleccion-home">Noticias de Colombia</h3></div>
                <NuxtLink to="/seleccion-colombia">Ver todas <span aria-hidden="true">→</span></NuxtLink>
              </div>
              <div v-if="noticiasSeleccionPortada.length" class="home-noticias-modulo home-noticias-seleccion">
                <TarjetaArticuloPortada v-for="articulo in noticiasSeleccionPortada" :key="articulo.slug" :articulo="articulo" />
              </div>
              <div v-else class="home-seleccion-sin-noticias">
                <p>Aún no hay noticias recientes de Pont3la10 para esta selección.</p>
                <a href="https://fcf.com.co/category/selecciones/noticias-seleccion-mayores/" target="_blank" rel="noopener noreferrer">Ver las últimas publicaciones de la FCF <span aria-hidden="true">↗</span></a>
              </div>
            </section>
            <section class="home-seleccion-convocatoria" aria-label="Estado de la convocatoria">
              <span class="home-seleccion-convocatoria-icono" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 17H5V9h14v10ZM5 7V6h2v1h2V6h6v1h2V6h2v1H5Z"/></svg>
              </span>
              <div>
                <span class="home-seleccion-convocatoria-etiqueta">Convocatoria</span>
                <strong>{{ convocatoriaVigente ? 'Lista vigente' : 'Sin lista vigente en esta agenda' }}</strong>
                <small v-if="convocatoriaVigente">{{ convocatoriaVigente.cantidad }} futbolistas · publicada {{ fechaPublicaPortada(convocatoriaVigente.publicadaEn) }}</small>
                <small v-else-if="ultimaConvocatoriaSeleccion">Última registrada: {{ ultimaConvocatoriaSeleccion.etiqueta.toLowerCase() }} · vigencia hasta {{ fechaPublicaPortada(ultimaConvocatoriaSeleccion.vigenteHasta) }}.</small>
                <small v-else>No hay una convocatoria publicada en esta agenda.</small>
              </div>
              <a :href="convocatoriaVigente ? (convocatoriaVigente.actualizacionUrl || convocatoriaVigente.fuenteUrl) : 'https://fcf.com.co/category/selecciones/noticias-seleccion-mayores/'" target="_blank" rel="noopener noreferrer" @click="registrarClicFuenteSeleccion">
                {{ convocatoriaVigente ? 'Ver convocatoria FCF' : 'Consultar FCF' }} <span aria-hidden="true">↗</span>
              </a>
            </section>
          </div>
        </div>
        <p v-if="urlAnuncioVerEnVivo" class="home-seleccion-aviso-publicidad">El primer clic en un enlace oficial abre un anuncio patrocinado de Adsterra; los siguientes te llevan a la FCF.</p>
      </section>

      <section v-if="noticiasInternacionales.length" class="medio-seccion home-bloque-tematico" aria-labelledby="titulo-internacional-home">
        <div class="medio-encabezado home-encabezado-seccion home-encabezado-internacionales">
          <div><p class="home-antetitulo">EL FÚTBOL EN EL MUNDO</p><h2 id="titulo-internacional-home">Fútbol internacional</h2><p>Noticias publicadas de ligas y competiciones internacionales.</p></div>
          <div class="home-internacional-acciones">
            <NuxtLink to="/futbol-internacional">Más noticias de fútbol internacional <span aria-hidden="true">→</span></NuxtLink>
            <nav v-if="totalPaginasNoticiasInternacionales > 1" class="home-noticias-paginacion" aria-label="Paginación de noticias internacionales">
              <button type="button" aria-label="Ver noticias internacionales anteriores" aria-controls="noticias-internacionales-portada" :disabled="paginaNoticiasInternacionales === 0" @click="cambiarPaginaNoticiasInternacionales(-1)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <span aria-live="polite" aria-atomic="true">{{ paginaNoticiasInternacionales + 1 }} de {{ totalPaginasNoticiasInternacionales }}</span>
              <button type="button" aria-label="Ver siguientes noticias internacionales" aria-controls="noticias-internacionales-portada" :disabled="paginaNoticiasInternacionales >= totalPaginasNoticiasInternacionales - 1" @click="cambiarPaginaNoticiasInternacionales(1)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </nav>
          </div>
        </div>
        <div id="noticias-internacionales-portada" class="home-noticias-modulo home-noticias-europa home-noticias-internacionales">
          <TarjetaArticuloPortada v-for="articulo in noticiasPaginaInternacionales" :key="articulo.slug" :articulo="articulo" />
        </div>
      </section>

      <section class="medio-seccion home-bloque-tematico home-europa" aria-labelledby="titulo-europa-home">
        <div class="medio-encabezado home-encabezado-seccion">
          <div><p class="home-antetitulo">FÚTBOL INTERNACIONAL</p><h2 id="titulo-europa-home">Colombianos en el exterior</h2><p>Noticias y perfiles verificados de {{ perfilesEuropaPortada.length }} futbolistas colombianos en sus clubes y ligas.</p></div>
          <NuxtLink to="/colombianos-en-europa">Ver colombianos en Europa <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <nav class="home-perfiles-europa" aria-label="Perfiles verificados de futbolistas colombianos">
          <NuxtLink v-for="jugador in perfilesEuropaPortada" :key="jugador.slug" :to="`/jugadores/${encodeURIComponent(jugador.slug)}`">
            <img :src="jugador.imagenPerfil" :alt="`Retrato animado de ${jugador.nombre}`" width="40" height="40" loading="lazy" decoding="async">
            <strong>{{ jugador.nombre }}</strong><small>{{ jugador.club }} · {{ jugador.competencia }}</small>
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
            <NuxtLink to="/articulos">Todas las noticias deportivas <span aria-hidden="true">→</span></NuxtLink>
          </div>
          <ol v-if="ultimasNoticias.length" class="medio-ultimas">
            <li
              v-for="articulo in ultimasNoticias"
              :key="articulo.slug"
              :class="{ 'noticia-apertura-desktop-extra': slugsSecundariasAmpliadas.has(articulo.slug) }"
            >
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
          <NuxtLink v-for="categoria in categoriasSitio" :key="categoria.ruta" :to="categoria.ruta">{{ categoria.etiqueta === 'Tech deportiva' ? 'Tecnología deportiva' : categoria.etiqueta }} <span aria-hidden="true">↗</span></NuxtLink>
        </nav>
      </section>

      <section class="medio-patrocinios" aria-label="Anúnciate con nosotros">
        <div><h2>¿Quieres anunciarte en Pont3la10?</h2><p>Conecta con nuestra comunidad de deporte y tecnología.</p></div>
        <a href="mailto:contact@pont3la10.com">contact@pont3la10.com <span aria-hidden="true">→</span></a>
      </section>
      <section class="medio-institucional medio-seccion" aria-labelledby="titulo-sobre-home">
        <h2 id="titulo-sobre-home">Fútbol colombiano, con la jugada clara</h2>
        <p>Pont3la10 cubre la actualidad del fútbol colombiano, la Selección Colombia y los principales torneos internacionales. Aquí encuentras noticias de la Liga BetPlay, tabla de posiciones, resultados, próximos partidos y horarios en Colombia. Sigue también la actualidad de futbolistas colombianos en Europa y consulta sus perfiles. Nuestra portada reúne las historias publicadas por el equipo editorial y los datos deportivos disponibles, con fechas y fuentes para entender cada información. Explora las noticias, el calendario y los análisis para seguir el juego dentro y fuera de la cancha.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.portada-medio { background: #07182f; color: #f5f8ff; padding-bottom: 32px; }
.medio-contenedor { width: min(1240px, calc(100% - 48px)); margin: 0 auto; }
.medio-edicion { display: flex; justify-content: space-between; gap: 16px; padding: 18px 0 14px; color: #9eafc8; font-size: .62rem; letter-spacing: .12em; }
.medio-edicion span:first-child { color: #ffd800; font-weight: 800; }
.medio-apertura { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.3fr) minmax(0, 1.2fr); gap: 16px; align-items: stretch; }
.medio-apertura.sin-secundarias { grid-template-columns: minmax(220px, .72fr) minmax(0, 1.28fr); }
.medio-introduccion { min-width: 0; align-self: center; padding: 12px 8px 12px 0; }
.medio-introduccion .home-antetitulo { margin: 0; color: #ffd800; font-size: .65rem; font-weight: 800; letter-spacing: .09em; line-height: 1.5; }
.medio-introduccion h1 { margin: 8px 0 12px; color: #f5f8ff; font-size: clamp(1.8rem, 2.8vw, 2.65rem); font-weight: 850; line-height: 1.06; letter-spacing: -.045em; text-wrap: balance; }
.medio-introduccion > p:last-child { margin: 0; color: #a8bbd5; font-size: clamp(.86rem, 1.05vw, .98rem); line-height: 1.55; }
.medio-secundarias { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.medio-secundarias :deep(.noticia-portada.con-imagen:not(.principal)) { grid-template-columns: 1fr; grid-template-rows: 150px 1fr; align-content: start; }
.medio-secundarias :deep(.noticia-portada:not(.principal) .texto) { padding: 14px; }
.medio-apertura > :deep(.principal h2) { font-size: clamp(1.5rem, 2.2vw, 2.1rem); }
@media (min-width: 901px) {
  .medio-apertura {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
    grid-template-areas: "introduccion introduccion" "principal secundarias";
  }
  .medio-apertura.sin-secundarias {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "introduccion" "principal";
  }
  .medio-introduccion {
    display: grid;
    grid-area: introduccion;
    grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
    align-items: end;
    column-gap: 32px;
    row-gap: 12px;
    padding: 20px 4px 12px;
  }
  .medio-introduccion .home-antetitulo { grid-column: 1 / -1; }
  .medio-introduccion h1 { grid-column: 1; margin: 0; }
  .medio-introduccion > p:last-child { grid-column: 2; max-width: 48ch; margin: 0; }
  .medio-apertura > :deep(.principal) { grid-area: principal; min-height: 450px; align-self: stretch; }
  .medio-apertura > :deep(.principal .texto) {
    position: absolute;
    top: 50%;
    right: 0;
    bottom: 0;
    left: 0;
    box-sizing: border-box;
    width: auto;
    max-width: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: clamp(20px, 2vw, 32px);
  }
  .medio-apertura > :deep(.principal .texto > :is(h2, .resumen, .leer)) { max-width: 50%; }
  .medio-apertura > :deep(.principal .leer) { align-self: flex-start; }
  .medio-apertura > :deep(.principal.con-imagen::after) {
    background: linear-gradient(180deg, rgba(3,15,35,.02) 0%, rgba(3,15,35,.08) 40%, rgba(3,15,35,.92) 58%, rgba(3,15,35,.98) 100%);
  }
  .medio-apertura > :deep(.principal:not(.con-imagen)) { min-height: 450px; align-content: center; }
  .medio-secundarias {
    grid-area: secundarias;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    min-height: 450px;
  }
  .medio-secundarias :deep(.noticia-portada.con-imagen:not(.principal)) { grid-template-rows: 102px minmax(0, 1fr); }
  .medio-secundarias :deep(.noticia-portada.con-imagen:not(.principal) .foto) { min-height: 0; }
}
@media (min-width: 901px) {
  .medio-ultimas li.noticia-apertura-desktop-extra { display: none; }
}
.medio-institucional { border-top: 1px solid #294467; padding-top: 24px; }
.medio-institucional h2 { margin: 0 0 10px; color: #f5f8ff; font-size: 1.2rem; }
.medio-institucional p { max-width: 85ch; margin: 0; color: #a8bbd5; font-size: .9rem; line-height: 1.7; }
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
.home-calendario-link { display: inline-flex; align-items: center; gap: 5px; }
.home-calendario-link svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
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
.home-proximo-partido { background: linear-gradient(145deg, #102d50 0%, #0c2443 64%); }
.home-proximo-encabezado { align-items: center; }
.home-proximo-partido-detalle { display: grid; gap: 11px; }
.home-proximo-link { display: grid; gap: 16px; border-top: 1px solid #294467; padding-top: 15px; color: #e7edf6; text-decoration: none; }
.home-proximo-competencia { display: inline-flex; justify-self: center; align-items: center; gap: 6px; padding: 0; color: #dce7f5; font-size: .7rem; font-weight: 750; }
.home-proximo-competencia svg { width: 15px; height: 15px; fill: none; stroke: #ffd800; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.45; }
.home-proximo-enfrentamiento { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 10px; align-items: center; }
.home-proximo-equipo { display: grid; justify-items: center; gap: 9px; min-width: 0; }
.home-proximo-escudo { display: grid; width: 72px; height: 72px; place-items: center; border: 0; border-radius: 0; background: transparent; }
.home-proximo-escudo :deep(img) { width: 54px; height: 54px; object-fit: contain; }
.home-proximo-inicial { display: grid; width: 52px; height: 52px; place-items: center; color: #dce7f5; font-size: 1.2rem; font-weight: 850; }
.home-proximo-equipo strong { display: grid; min-height: 2.5em; width: 100%; max-width: 18ch; align-items: start; color: #fff; font-size: .86rem; line-height: 1.3; text-align: center; overflow-wrap: anywhere; }
.home-proximo-centro { display: grid; min-width: 30px; min-height: 0; place-items: center; border-radius: 0; background: transparent; padding: 0; color: #dce7f5; font-size: .77rem; font-weight: 800; }
.home-proximo-centro.home-proximo-en-vivo { background: #8d2838; color: #fff; }
.home-proximo-pie { display: flex; justify-content: space-between; align-items: center; gap: 10px; border-top: 1px solid rgba(69, 99, 132, .55); padding-top: 12px; }
.home-proximo-pie time { display: grid; gap: 3px; color: #fff; font-size: .75rem; font-weight: 750; }
.home-proximo-pie time b { color: #a8bbd5; font-size: .68rem; font-weight: 600; }
.home-proximo-accion { display: inline-flex; align-items: center; gap: 7px; color: #9beafa; font-size: .72rem; font-weight: 800; white-space: nowrap; }
.home-proximo-link:hover .home-proximo-accion { color: #ffd800; }
.home-ver-en-vivo { position: relative; display: grid; width: min(100%, 420px); aspect-ratio: 4.2 / 1; justify-self: center; place-items: center; overflow: hidden; border-radius: 16px; color: #fff; text-decoration: none; isolation: isolate; }
.home-ver-en-vivo-imagen { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
.home-ver-en-vivo-contenido { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 9px; color: #fff; font-size: .92rem; font-weight: 900; letter-spacing: .09em; text-shadow: 0 2px 5px #06152b; text-transform: uppercase; }
.home-ver-en-vivo-contenido svg { width: 19px; height: 19px; fill: #fff; filter: drop-shadow(0 1px 2px #06152b); }
.home-ver-en-vivo:hover { filter: brightness(1.13); transform: translateY(-1px); }
.home-ver-en-vivo:focus-visible { outline: 3px solid #ffd800; outline-offset: 3px; }
.home-ver-en-vivo-aviso { margin: 0; color: #a8bbd5; font-size: .62rem; line-height: 1.4; text-align: center; }
.home-noticias-modulo { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.home-seleccion { border: 1px solid #d8e0ea; border-radius: 18px; background: #f3f6fa; color: #111827; padding: clamp(16px, 2.4vw, 24px); }
.home-seleccion .medio-encabezado h2 { color: #111827; }
.home-seleccion .home-encabezado-seccion p:not(.home-antetitulo) { color: #111827; }
.home-seleccion .home-encabezado-seccion .home-antetitulo { color: #111827; }
.home-seleccion-fuente { display: inline-flex; align-items: center; gap: 6px; color: #111827; font-size: .72rem; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
.home-seleccion-fuente:hover, .home-seleccion-enlace-oficial:hover, .home-seleccion-sin-noticias a:hover { color: #003893; }
.home-seleccion-grid { display: grid; grid-template-columns: minmax(0, .94fr) minmax(0, 1.06fr); gap: 16px; align-items: stretch; }
.home-seleccion-aviso-publicidad { margin: 10px 0 0; color: #111827; font-size: .62rem; line-height: 1.4; }
.home-seleccion-partido { position: relative; display: grid; align-content: start; gap: 19px; overflow: hidden; border: 1px solid #d8e0ea; border-radius: 16px; background: #fff; padding: 21px; box-shadow: 0 8px 22px rgba(16, 24, 40, .07); }
.home-seleccion-partido::before { position: absolute; inset: 0 0 auto; height: 4px; background: linear-gradient(90deg, #fcd116 0 48%, #003893 48% 74%, #ce1126 74%); content: ''; }
.home-seleccion-partido-cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.home-seleccion-partido-cabecera > div { display: grid; gap: 5px; }
.home-seleccion-etiqueta, .home-seleccion-convocatoria-etiqueta { color: #111827; font-size: .63rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.home-seleccion-partido-cabecera > div > strong { color: #111827; font-size: .8rem; font-weight: 650; }
.home-seleccion-competicion { max-width: 46%; border: 1px solid #d8e0ea; border-radius: 999px; padding: 6px 9px; color: #111827; font-size: .62rem; line-height: 1.2; text-align: center; }
.home-seleccion-duelo { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 12px; min-height: 156px; }
.home-seleccion-equipo { display: grid; justify-items: center; gap: 8px; min-width: 0; text-align: center; }
.home-seleccion-equipo > strong { color: #111827; font-size: clamp(1rem, 1.8vw, 1.4rem); line-height: 1.1; overflow-wrap: anywhere; }
.home-seleccion-equipo > small { color: #111827; font-size: .61rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.home-seleccion-bandera { display: grid; width: 64px; height: 43px; overflow: hidden; border: 1px solid rgba(255, 255, 255, .18); border-radius: 7px; box-shadow: 0 5px 12px rgba(0, 0, 0, .22); }
.home-bandera-colombia { grid-template-rows: 2fr 1fr 1fr; }
.home-bandera-colombia span:first-child { background: #fcd116; }
.home-bandera-colombia span:nth-child(2) { background: #003893; }
.home-bandera-colombia span:nth-child(3) { background: #ce1126; }
.home-bandera-chile { position: relative; grid-template-columns: 1fr 2fr; grid-template-rows: 1fr 1fr; }
.home-bandera-chile-blanco { grid-column: 1 / -1; grid-row: 1; background: #fff; }
.home-bandera-chile-rojo { grid-column: 1 / -1; grid-row: 2; background: #d52b1e; }
.home-bandera-chile-azul { z-index: 1; grid-column: 1; grid-row: 1; display: grid; place-items: center; background: #0039a6; color: #fff; font-size: .9rem; }
.home-bandera-fallback { place-items: center; border-color: #d8e0ea; background: #f3f6fa; color: #111827; font-size: .82rem; font-weight: 850; letter-spacing: .06em; }
.home-seleccion-vs { color: #111827; font-size: .68rem; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
.home-seleccion-detalles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border-top: 1px solid #d8e0ea; padding-top: 15px; }
.home-seleccion-detalle { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px; align-items: start; min-width: 0; }
.home-seleccion-detalle > svg { width: 18px; height: 18px; fill: #003893; }
.home-seleccion-detalle > span { display: grid; gap: 4px; min-width: 0; }
.home-seleccion-detalle strong, .home-seleccion-detalle small { color: #111827; font-size: .72rem; line-height: 1.4; }
.home-seleccion-enlace-oficial { justify-self: start; color: #111827; font-size: .7rem; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
.home-seleccion-sin-partido { margin: 0; color: #111827; font-size: .82rem; line-height: 1.5; }
.home-seleccion-lateral { display: grid; align-content: start; gap: 14px; min-width: 0; }
.home-seleccion-noticias { display: grid; gap: 10px; }
.home-seleccion-subcabecera { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
.home-seleccion-subcabecera > div { display: grid; gap: 4px; }
.home-seleccion-subcabecera > div > span { color: #111827; font-size: .6rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.home-seleccion-subcabecera h3 { margin: 0; color: #111827; font-size: 1rem; line-height: 1.2; }
.home-seleccion-subcabecera > a { color: #111827; font-size: .66rem; font-weight: 750; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
.home-seleccion-subcabecera > a:hover { color: #003893; }
.home-noticias-seleccion { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.home-noticias-seleccion :deep(.tarjeta-articulo-portada) { border-color: #d8e0ea; background: #fff; }
.home-noticias-seleccion :deep(.contenido-articulo-portada p), .home-noticias-seleccion :deep(.contenido-articulo-portada h3), .home-noticias-seleccion :deep(.contenido-articulo-portada h3 a), .home-noticias-seleccion :deep(.contenido-articulo-portada > span) { color: #111827; }
.home-noticias-seleccion :deep(.contenido-articulo-portada h3 a:hover) { color: #003893; }
.home-seleccion-sin-noticias { display: grid; gap: 7px; border: 1px solid #d8e0ea; border-radius: 12px; background: #fff; padding: 14px; }
.home-seleccion-sin-noticias p { margin: 0; color: #111827; font-size: .74rem; line-height: 1.45; }
.home-seleccion-sin-noticias a { color: #111827; font-size: .69rem; font-weight: 750; text-decoration: underline; text-underline-offset: 3px; }
.home-seleccion-convocatoria { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 11px; border-top: 1px solid #d8e0ea; padding-top: 13px; }
.home-seleccion-convocatoria-icono { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid #d8e0ea; border-radius: 9px; background: #fff; }
.home-seleccion-convocatoria-icono svg { width: 18px; height: 18px; fill: #003893; }
.home-seleccion-convocatoria > div { display: grid; gap: 3px; min-width: 0; }
.home-seleccion-convocatoria > div > strong, .home-seleccion-convocatoria > div > small { color: #111827; font-size: .73rem; line-height: 1.4; }
.home-seleccion-convocatoria > a { color: #111827; font-size: .64rem; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
.home-seleccion-convocatoria > a:hover { color: #003893; }
.home-perfiles-europa { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.home-perfiles-europa a { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 2px 9px; align-items: center; min-width: 0; border: 1px solid #294467; border-radius: 9px; background: #0c2443; padding: 10px; text-decoration: none; }
.home-perfiles-europa a:hover { border-color: #7ce6f5; }
.home-perfiles-europa a > img { display: block; width: 40px; height: 40px; grid-row: span 2; border: 1px solid #78dcf4; border-radius: 50%; background: #173657; object-fit: cover; object-position: center 28%; }
.home-perfiles-europa strong { overflow: hidden; color: #fff; font-size: .74rem; text-overflow: ellipsis; white-space: nowrap; }
.home-perfiles-europa small { overflow: hidden; color: #a8bbd5; font-size: .61rem; text-overflow: ellipsis; white-space: nowrap; }
.home-noticias-europa { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.home-encabezado-internacionales { align-items: center; }
.home-internacional-acciones { display: flex; align-items: center; gap: 14px; }
.home-internacional-acciones > a { max-width: 28ch; text-align: right; }
.home-noticias-paginacion { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 7px; }
.home-noticias-paginacion button { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid #294467; border-radius: 50%; background: #0c2443; color: #e7edf6; cursor: pointer; transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease; }
.home-noticias-paginacion button:hover:not(:disabled) { border-color: #7ce6f5; background: #173657; color: #ffd800; }
.home-noticias-paginacion button:disabled { cursor: not-allowed; opacity: .42; }
.home-noticias-paginacion button:focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
.home-noticias-paginacion svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
.home-noticias-paginacion > span { min-width: 3.4em; color: #a8bbd5; font-size: .68rem; font-variant-numeric: tabular-nums; text-align: center; }
.home-sin-datos-contenido { border: 1px solid #294467; border-radius: 10px; background: #0c2443; padding: 16px; }
.home-analisis-tarjeta { width: min(100%, 420px); }
.home-jornada :deep(.espacio-adsterra) { margin-top: 16px; }
.portada-medio a:focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 900px) {
  .medio-apertura { grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); }
  .medio-apertura.sin-secundarias { grid-template-columns: minmax(0, .84fr) minmax(0, 1.16fr); }
  .medio-secundarias { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .medio-secundarias :deep(.noticia-portada:nth-child(n + 3)) { display: none; }
  .medio-actualidad { gap: 20px; }
  .medio-patrocinios { align-items: start; flex-direction: column; }
  .home-noticias-europa { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-perfiles-europa { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-seleccion-grid { grid-template-columns: 1fr; }
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
  .home-encabezado-internacionales { align-items: flex-start; }
  .home-internacional-acciones { width: 48%; flex-direction: column; align-items: flex-end; gap: 9px; }
  .home-internacional-acciones > a { max-width: 100%; white-space: normal; }
  .home-noticias-paginacion { gap: 6px; }
  .home-noticias-paginacion button { width: 32px; height: 32px; }
  .home-jornada-grid, .home-liga-grid, .home-seleccion-grid { grid-template-columns: 1fr; }
  .home-seleccion-partido { padding: 17px; }
  .home-seleccion-detalles { grid-template-columns: 1fr; }
  .home-noticias-seleccion { grid-auto-flow: row; grid-auto-columns: initial; grid-template-columns: 1fr; overflow: visible; }
  .home-seleccion-convocatoria { grid-template-columns: 30px minmax(0, 1fr); gap: 9px; }
  .home-seleccion-convocatoria-icono { width: 30px; height: 30px; }
  .home-seleccion-convocatoria > a { grid-column: 2; }
  .home-panel { padding: 15px; }
  .home-lista-partidos, .home-lista-resultados { grid-auto-columns: minmax(245px, 82vw); grid-auto-flow: column; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 5px; scroll-snap-type: x proximity; }
  .home-lista-partidos li, .home-lista-resultados li { scroll-snap-align: start; }
  .home-noticias-modulo, .home-noticias-europa { grid-auto-columns: minmax(245px, 82vw); grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 4px; scroll-snap-type: x proximity; }
  .home-noticias-internacionales { grid-auto-flow: row; grid-auto-columns: initial; grid-template-columns: 1fr; overflow: visible; padding-bottom: 0; scroll-snap-type: none; }
  .home-noticias-modulo > * { scroll-snap-align: start; }
  .home-perfiles-europa { grid-auto-columns: minmax(220px, 72vw); grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 5px; }
  .home-perfiles-europa > * { scroll-snap-align: start; }
  .home-equipo-tabla { min-width: 125px; }
  .home-tabla-titulo { align-items: flex-start; }
}
@media (max-width: 370px) {
  .medio-secundarias { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .home-noticias-paginacion button { transition: none; }
}
</style>
