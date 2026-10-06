<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { construirUrlAbsoluta } from '~/utils/seo'
import { construirSportsEventSeo, etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

const ruta = useRoute()
const configuracion = useRuntimeConfig()
const slug = String(ruta.params.slug || '')
const { data, error, refresh } = await useFetch<{ partido: PartidoSeoPublico }>(`/api/partidos-seo/${encodeURIComponent(slug)}`)
if (error.value || !data.value?.partido) {
  const statusCode = Number(error.value?.statusCode || error.value?.status || 503)
  throw createError({ statusCode, statusMessage: statusCode === 404 ? 'No encontramos ese partido.' : 'No se pudo cargar la información verificada del partido.' })
}
const partidoInicial = data.value.partido
const partido = computed(() => data.value?.partido || partidoInicial)
if (partido.value.slug !== slug) {
  await navigateTo(`/como-quedo/${partido.value.slug}`, { redirectCode: 301, replace: true })
}
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  query: { tema: 'liga-betplay', buscar: partido.value.local, limite: '4' },
  default: () => []
})
const marcador = computed(() => partido.value.golesLocal !== null && partido.value.golesVisitante !== null
  ? `${partido.value.golesLocal}–${partido.value.golesVisitante}`
  : 'Marcador pendiente')

useSeoPont3la10(() => {
  const actual = partido.value
  const descripcion = `${marcador.value} · ${actual.competencia}, ${actual.temporada}. Consulta el estado y la información publicada de ${actual.local} vs ${actual.visitante}.`
  const urlCanonica = construirUrlAbsoluta(String(configuracion.public.siteUrl), `/como-quedo/${actual.slug}`)
  const eventoSchema = construirSportsEventSeo({ ...actual, urlCanonica, descripcion })
  return {
    titulo: `Cómo quedó ${actual.local} vs ${actual.visitante}: resultado y marcador | Pont3la10`,
    descripcion,
    rutaCanonica: `/como-quedo/${actual.slug}`,
    imagen: `/api/partidos-seo/${encodeURIComponent(actual.slug)}/imagen?formato=og`,
    imagenTipo: 'image/png',
    imagenAncho: 1200,
    imagenAlto: 628,
    tipoOpenGraph: 'website',
    seccion: actual.competencia,
    fechaModificacion: actual.verificadoEn,
    datosEstructurados: [
      ...(eventoSchema ? [eventoSchema] : []),
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
          { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
          { '@type': 'ListItem', position: 3, name: `${actual.local} vs ${actual.visitante}`, item: urlCanonica }
        ]
      }
    ]
  }
})

let temporizadorMarcador: number | undefined
let actualizacionEnCurso = false
const estadosFinales = ['FINALIZADO', 'CANCELADO', 'APLAZADO', 'REPROGRAMADO', 'SUSPENDIDO', 'ABANDONADO']

async function actualizarMarcadorSiCorresponde() {
  if (actualizacionEnCurso || document.visibilityState !== 'visible') return
  const estado = etiquetaEstadoSeoPartido(partido.value.estado)
  if (estadosFinales.includes(estado)) return
  const inicio = Date.parse(partido.value.fechaIso)
  const minutosDesdeInicio = Date.now() - inicio
  if (!Number.isFinite(inicio) || minutosDesdeInicio < -15 * 60_000 || minutosDesdeInicio > 4 * 60 * 60_000) return

  actualizacionEnCurso = true
  try {
    await refresh()
  } catch {
    // Un fallo temporal no detiene la actualización del siguiente minuto.
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
  <PublicoPlantillaPartidoSeo modo="como-quedo" :partido="partido" :noticias="noticias || []" />
</template>
