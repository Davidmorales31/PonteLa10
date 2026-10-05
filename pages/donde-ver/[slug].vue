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
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  query: { tema: 'liga-betplay', buscar: partido.local, limite: '4' },
  default: () => []
})
const titulo = `Dónde ver ${partido.local} vs ${partido.visitante}: horario y canal | Pont3la10`
const descripcion = `Horario de Colombia, estadio y programación oficial de ${partido.local} vs ${partido.visitante} por ${partido.competencia}. El canal se mostrará cuando se confirme.`
const urlCanonica = construirUrlAbsoluta(String(configuracion.public.siteUrl), `/donde-ver/${partido.slug}`)
const eventoSchema = construirSportsEventSeo({
  ...partido,
  urlCanonica,
  descripcion
})

useSeoPont3la10(() => ({
  titulo,
  descripcion,
  rutaCanonica: `/donde-ver/${partido.slug}`,
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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: `¿A qué hora juega ${partido.local} vs ${partido.visitante}?`, acceptedAnswer: { '@type': 'Answer', text: `La fecha y hora publicadas son ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(partido.fechaIso))}, hora de Colombia.` } },
        { '@type': 'Question', name: `¿Dónde ver ${partido.local} vs ${partido.visitante}?`, acceptedAnswer: { '@type': 'Answer', text: 'El canal o plataforma está por confirmar. Consulta la programación oficial de DIMAYOR.' } }
      ]
    }
  ]
}))
</script>

<template>
  <PublicoPlantillaPartidoSeo modo="donde-ver" :partido="partido" :noticias="noticias || []" />
</template>
