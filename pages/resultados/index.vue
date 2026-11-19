<script setup lang="ts">
import type { RespuestaResultados } from '~/types/resultados'
import { construirUrlAbsoluta } from '~/utils/seo'
const origenSitio = useOrigenSitio()
const { sitio: sitioActivo } = useSitio()

const { data: respuestaSeo } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'seo-centro-resultados',
  lazy: true
})

useSeoPont3la10(() => ({
  titulo: 'Resultados deportivos y marcadores en vivo | Pont3la10',
  descripcion: 'Consulta resultados de fútbol, baloncesto, tenis y béisbol, marcadores recientes y próximos encuentros.',
  rutaCanonica: '/resultados',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Resultados deportivos y marcadores',
    description: 'Partidos, resultados recientes y próximos encuentros de múltiples deportes.',
    inLanguage: sitioActivo.value.idioma,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (respuestaSeo.value?.partidos || []).map((partido, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}`,
        url: construirUrlAbsoluta(origenSitio.value, `/resultados/${partido.id}`)
      }))
    }
  }
}))
</script>

<template>
  <CentroResultadosDeportivos />
</template>
