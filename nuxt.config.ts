const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', ...(supabaseConfigured ? ['@nuxtjs/supabase'] : [])],
  css: ['~/assets/css/main.css'],
  ...(supabaseConfigured
    ? {
        supabase: {
          url: supabaseUrl,
          key: supabaseKey,
          redirectOptions: {
            login: '/admin/login',
            callback: '/confirm',
            exclude: ['/', '/articulos', '/articulos/**', '/categorias/**', '/especiales/**']
          }
        }
      }
    : {}),
  app: {
    head: {
      htmlAttrs: { lang: 'es-CO' },
      title: 'Pont3la10 - Deporte, tecnologia y tendencias',
      meta: [
        {
          name: 'description',
          content:
            'Pont3la10 reune noticias, analisis, especiales y herramientas interactivas para vivir el deporte desde otra cancha.'
        },
        { name: 'theme-color', content: '#08204A' },
        { property: 'og:site_name', content: 'Pont3la10' },
        { property: 'og:type', content: 'website' }
      ],
      link: [{ rel: 'icon', type: 'image/png', href: '/brand/pont3la10_logo_05_app_icon_favicon.png' }]
    }
  },
  runtimeConfig: {
    editorialAiApiKey: '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
})
