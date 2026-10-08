const rutasClave = [
  '/',
  '/partidos-hoy',
  '/liga-colombiana',
  '/colombianos-en-europa'
]

const baseUrl = process.env.CWV_BASE_URL || 'http://127.0.0.1:4173'
const iniciarPreviewLocal = process.env.CWV_START_LOCAL_SERVER === 'true'

const collect = {
  url: rutasClave.map(ruta => new URL(ruta, baseUrl).toString()),
  numberOfRuns: 3,
  settings: {
    formFactor: 'mobile',
    onlyCategories: ['performance']
  }
}

if (iniciarPreviewLocal) {
  collect.startServerCommand = 'npm run preview -- --host=127.0.0.1 --port=4173'
  collect.startServerReadyPattern = '4173'
  collect.startServerReadyTimeout = 60000
}

module.exports = {
  ci: {
    collect,
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.45, aggregationMethod: 'median-run' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 9000, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.3, aggregationMethod: 'median-run' }],
        'total-blocking-time': ['error', { maxNumericValue: 800, aggregationMethod: 'median-run' }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci'
    }
  }
}
