<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { construirUrlAbsoluta, robotsNoIndex } from '~/utils/seo'
import { construirSportsEventSeo, etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import type { ContextoAnaliticaPagina } from '~/utils/analiticaPublica'

const ruta = useRoute()
const configuracion = useRuntimeConfig()
const slug = String(ruta.params.slug || '')
const { data, error, refresh } = await useFetch<{ partido: PartidoSeoPublico }>(
  `/api/partidos-seo/${encodeURIComponent(slug)}`
)

if (error.value || !data.value?.partido) {
  const statusCode = Number(error.value?.statusCode || error.value?.status || 503)
  throw createError({
    statusCode,
    statusMessage: statusCode === 404
      ? 'No encontramos ese partido.'
      : 'No se pudo cargar la información verificada del partido.'
  })
}

const partidoInicial = data.value.partido
const partido = computed(() => data.value?.partido || partidoInicial)
if (partido.value.slug !== slug) {
  await navigateTo(`/partidos/${partido.value.slug}`, { redirectCode: 301, replace: true })
}

const { data: noticias } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  query: { tema: 'liga-betplay', buscar: partido.value.local, limite: '4' },
  default: () => []
})

const fechaVisible = computed(() => {
  const fecha = new Date(partido.value.fechaIso)
  if (!Number.isFinite(fecha.getTime())) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(fecha)
})
const marcador = computed(() => partido.value.golesLocal !== null && partido.value.golesVisitante !== null
  ? `${partido.value.golesLocal}–${partido.value.golesVisitante}`
  : null)
const estadoVisible = computed(() => etiquetaEstadoSeoPartido(partido.value.estado))
const indexable = computed(() => evaluarIndexabilidad({
  ...partido.value,
  transmisionVerificada: Boolean(partido.value.transmisiones?.length)
}))
const contextoAnalitica = useState<ContextoAnaliticaPagina | null>('contexto-analitica-pagina', () => null)
watchEffect(() => {
  contextoAnalitica.value = {
    ruta: `/partidos/${partido.value.slug}`,
    competition: partido.value.competencia,
    match_status: partido.value.estado ? estadoVisible.value : null
  }
})
const titulo = computed(() => `${partido.value.local} vs ${partido.value.visitante}: fecha, hora y resultado | Pont3la10`)
const descripcion = computed(() => [
  `${partido.value.local} vs ${partido.value.visitante} por ${partido.value.competencia}.`,
  `${fechaVisible.value}, hora de Colombia.`,
  marcador.value ? `Marcador: ${marcador.value}.` : 'Consulta el estado y el marcador cuando esté confirmado.',
  partido.value.transmisiones?.length
    ? `Transmisión: ${partido.value.transmisiones.map(transmision => `${transmision.channel} en ${transmision.platform}`).join(', ')}.`
    : 'Canal o plataforma por confirmar.'
].join(' '))
const rutaCanonica = computed(() => `/partidos/${partido.value.slug}`)
const urlCanonica = computed(() => construirUrlAbsoluta(String(configuracion.public.siteUrl), rutaCanonica.value))

useSeoPont3la10(() => {
  const evento = construirSportsEventSeo({
    ...partido.value,
    urlCanonica: urlCanonica.value,
    descripcion: descripcion.value
  })

  return {
    titulo: titulo.value,
    descripcion: descripcion.value,
    rutaCanonica: rutaCanonica.value,
    imagen: `/api/partidos-seo/${encodeURIComponent(partido.value.slug)}/imagen?formato=og`,
    imagenTipo: 'image/png',
    imagenAncho: 1200,
    imagenAlto: 628,
    tipoOpenGraph: 'website',
    seccion: partido.value.competencia,
    fechaModificacion: partido.value.verificadoEn,
    robots: indexable.value ? undefined : robotsNoIndex,
    datosEstructurados: [
      ...(evento ? [evento] : []),
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
          { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
          { '@type': 'ListItem', position: 3, name: `${partido.value.local} vs ${partido.value.visitante}`, item: urlCanonica.value }
        ]
      }
    ]
  }
})

let temporizadorMarcador: number | undefined
let actualizacionEnCurso = false
const estadosFinales = ['FINALIZADO', 'CANCELADO', 'APLAZADO', 'REPROGRAMADO', 'SUSPENDIDO', 'ABANDONADO']

async function actualizarMarcadorSiCorresponde() {
  if (!import.meta.client || actualizacionEnCurso || document.visibilityState !== 'visible') return
  if (estadosFinales.includes(estadoVisible.value)) return
  const inicio = Date.parse(partido.value.fechaIso)
  const minutosDesdeInicio = Date.now() - inicio
  if (!Number.isFinite(inicio) || minutosDesdeInicio < -15 * 60_000 || minutosDesdeInicio > 4 * 60 * 60_000) return

  actualizacionEnCurso = true
  try {
    await refresh()
  } catch {
    // Un fallo temporal no detiene la siguiente actualización del estado público.
  } finally {
    actualizacionEnCurso = false
  }
}

onMounted(() => {
  temporizadorMarcador = window.setInterval(() => { void actualizarMarcadorSiCorresponde() }, 60_000)
})

onBeforeUnmount(() => {
  if (temporizadorMarcador) window.clearInterval(temporizadorMarcador)
})
</script>

<template>
  <PublicoPlantillaPartidoSeo v-if="data?.partido" modo="partido" :partido="partido" :noticias="noticias || []" />
</template>
