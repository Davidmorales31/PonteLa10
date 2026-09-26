const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const dominioProduccionVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : ''
const urlPublica = process.env.NUXT_PUBLIC_SITE_URL || dominioProduccionVercel

if (process.env.NODE_ENV === 'production' && !urlPublica) {
  throw new Error(
    'Configura NUXT_PUBLIC_SITE_URL (dominio canónico público) o VERCEL_PROJECT_PRODUCTION_URL antes de compilar para producción.'
  )
}

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  experimental: {
    appManifest: false
  },
  modules: ['@nuxt/eslint'],
  css: [
    '~/assets/css/main.css',
    '~/assets/css/landing.css',
    '~/assets/css/resultados.css',
    '~/assets/css/admin.css'
  ],
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
      link: [
        { rel: 'icon', type: 'image/png', href: '/brand/pont3la10_logo_05_app_icon_favicon.png' },
        { rel: 'apple-touch-icon', href: '/brand/pont3la10_logo_05_app_icon_favicon.png' },
        { rel: 'preconnect', href: 'https://r2.thesportsdb.com', crossorigin: 'anonymous' },
        { rel: 'dns-prefetch', href: 'https://r2.thesportsdb.com' }
      ]
    }
  },
  runtimeConfig: {
    tiktokPythonPath: process.env.NUXT_TIKTOK_PYTHON_PATH || '',
    tiktokWorkerPath: process.env.NUXT_TIKTOK_WORKER_PATH || 'workers/transcribir_tiktok.py',
    tiktokWhisperModel: process.env.NUXT_TIKTOK_WHISPER_MODEL || 'base',
    editorialAiApiKey: process.env.NUXT_EDITORIAL_AI_API_KEY || '',
    editorialAiBaseUrl: process.env.NUXT_EDITORIAL_AI_BASE_URL || 'https://api.deepseek.com',
  editorialAiModel: process.env.NUXT_EDITORIAL_AI_MODEL || '',
  codexEditorialApiSecret: process.env.NUXT_CODEX_EDITORIAL_API_SECRET || '',
  supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || '',
    apiSportsKey: process.env.NUXT_API_SPORTS_KEY || process.env.API_SPORTS_KEY || '',
    apiSportsBaseUrl: process.env.NUXT_API_SPORTS_BASE_URL || 'https://v3.football.api-sports.io',
    apiBasketballKey: process.env.NUXT_API_BASKETBALL_KEY || '',
    apiBasketballBaseUrl: process.env.NUXT_API_BASKETBALL_BASE_URL || 'https://v1.basketball.api-sports.io',
    theSportsDbApiKey: process.env.NUXT_THE_SPORTS_DB_API_KEY || '123',
    theSportsDbBaseUrl: process.env.NUXT_THE_SPORTS_DB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json',
    public: {
      siteUrl: urlPublica || 'http://localhost:3001',
      supabaseUrl,
      supabaseKey
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
})
