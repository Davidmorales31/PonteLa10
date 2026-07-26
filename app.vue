<script setup lang="ts">
import BloqueoInterfazGlobal from '~/components/BloqueoInterfazGlobal.vue'
import { construirUrlAbsoluta, normalizarUrlSitio, serializarJsonLd } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const urlSitio = normalizarUrlSitio(String(configuracion.public.siteUrl))
const identidadSeo = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${urlSitio}/#organizacion`,
      name: 'Pont3la10',
      url: urlSitio,
      logo: {
        '@type': 'ImageObject',
        url: construirUrlAbsoluta(urlSitio, '/brand/pont3la10_logo_06_horizontal_sobre_blanco.png')
      }
    },
    {
      '@type': 'WebSite',
      '@id': `${urlSitio}/#sitio-web`,
      name: 'Pont3la10',
      url: urlSitio,
      inLanguage: 'es-CO',
      publisher: { '@id': `${urlSitio}/#organizacion` }
    }
  ]
}

useSeoMeta({
  ogSiteName: 'Pont3la10',
  ogLocale: 'es_CO',
  themeColor: '#08204A'
})

useHead({
  script: [{
    key: 'identidad-estructurada-pont3la10',
    type: 'application/ld+json',
    innerHTML: serializarJsonLd(identidadSeo)
  }]
})
</script>

<template>
  <NuxtLoadingIndicator color="#ffd800" :height="3" :throttle="120" />
  <BloqueoInterfazGlobal />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
