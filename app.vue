<script setup lang="ts">
import BloqueoInterfazGlobal from '~/components/BloqueoInterfazGlobal.vue'
import AlertasEditorialesGlobales from '~/components/AlertasEditorialesGlobales.vue'
import { construirUrlAbsoluta, normalizarUrlSitio, serializarJsonLd } from '~/utils/seo'
import { origenDelSitio } from '~/utils/sitio'

const configuracion = useRuntimeConfig()
const rutaActual = useRoute()
const { id: idSitio, sitio } = useSitio()
const urlSitio = computed(() => normalizarUrlSitio(origenDelSitio(idSitio.value, String(configuracion.public.siteUrl))))
const identidadSeo = computed(() => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': rutaActual.path === '/' ? 'NewsMediaOrganization' : 'Organization',
      '@id': `${urlSitio.value}/#organizacion`,
      name: sitio.value.nombre,
      url: urlSitio.value,
      logo: {
        '@type': 'ImageObject',
        url: construirUrlAbsoluta(urlSitio.value, '/brand/pont3la10_logo_06_horizontal_sobre_blanco.png')
      }
    },
    {
      '@type': 'WebSite',
      '@id': `${urlSitio.value}/#sitio-web`,
      name: sitio.value.nombre,
      url: urlSitio.value,
      inLanguage: sitio.value.idioma,
      publisher: { '@id': `${urlSitio.value}/#organizacion` }
    }
  ]
}))

useSeoMeta({
  ogSiteName: sitio.value.nombre,
  ogLocale: sitio.value.ogLocale,
  themeColor: '#08204A'
})

// El sistema usa una sola apariencia, desde SSR y sin depender del navegador.
useHead({
  htmlAttrs: { lang: sitio.value.idioma, style: 'color-scheme: only light' },
  bodyAttrs: { class: 'tema-publico-blanco' },
  meta: [{ name: 'color-scheme', content: 'only light' }]
})

onMounted(() => {
  try {
    window.localStorage.removeItem('pont3la10:tema-publico')
  } catch {
    // El almacenamiento bloqueado no afecta la apariencia fija del sistema.
  }
})

useHead(() => ({
  script: [{
    key: 'identidad-estructurada-pont3la10',
    type: 'application/ld+json',
    innerHTML: serializarJsonLd(identidadSeo.value)
  }]
}))
</script>

<template>
  <NuxtLoadingIndicator color="#ffd800" :height="3" :throttle="120" />
  <BloqueoInterfazGlobal />
  <AlertasEditorialesGlobales />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
