<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { construirUrlAbsoluta } from '~/utils/seo'
import { construirSportsEventSeo } from '~/utils/schemaPartidoSeo'

const ruta = useRoute()
const configuracion = useRuntimeConfig()
const slug = String(ruta.params.slug || '')
const { data, error } = await useFetch<{ partido: PartidoSeoPublico }>(`/api/partidos-seo/${encodeURIComponent(slug)}`)
if (error.value || !data.value?.partido) {
  const statusCode = Number(error.value?.statusCode || error.value?.status || 503)
  throw createError({ statusCode, statusMessage: statusCode === 404 ? 'No encontramos ese partido.' : 'No se pudo cargar la información verificada del partido.' })
}
const partido = data.value.partido
if (partido.slug !== slug) {
  await navigateTo(`/como-quedo/${partido.slug}`, { redirectCode: 301, replace: true })
}
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  query: { tema: 'liga-betplay', buscar: partido.local, limite: '4' },
  default: () => []
})
const marcador = partido.golesLocal !== null && partido.golesVisitante !== null
  ? `${partido.golesLocal}–${partido.golesVisitante}`
  : 'Marcador pendiente'
const titulo = `Cómo quedó ${partido.local} vs ${partido.visitante}: resultado y marcador | Pont3la10`
const descripcion = `${marcador} · ${partido.competencia}, ${partido.temporada}. Consulta el estado y la información publicada de ${partido.local} vs ${partido.visitante}.`
const urlCanonica = construirUrlAbsoluta(String(configuracion.public.siteUrl), `/como-quedo/${partido.slug}`)
const eventoSchema = construirSportsEventSeo({
  ...partido,
  urlCanonica,
  descripcion
})

useSeoPont3la10(() => ({
  titulo,
  descripcion,
  rutaCanonica: `/como-quedo/${partido.slug}`,
  imagen: `/api/partidos-seo/${encodeURIComponent(partido.slug)}/imagen?formato=og`,
  imagenTipo: 'image/png',
  imagenAncho: 1200,
  imagenAlto: 628,
  tipoOpenGraph: 'website',
  seccion: partido.competencia,
  fechaModificacion: partido.verificadoEn,
  datosEstructurados: [
    ...(eventoSchema ? [eventoSchema] : []),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
        { '@type': 'ListItem', position: 3, name: `${partido.local} vs ${partido.visitante}`, item: urlCanonica }
      ]
    }
  ]
}))
</script>

<template>
  <PublicoPlantillaPartidoSeo modo="como-quedo" :partido="partido" :noticias="noticias || []" />
</template>
