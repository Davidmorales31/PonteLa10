import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const leer = (ruta: string) => readFileSync(resolve(process.cwd(), ruta), 'utf8')
const configuracionNuxt = leer('nuxt.config.ts')
const layoutPublico = leer('layouts/default.vue')
const layoutAdmin = leer('layouts/admin.vue')
const estilosBase = leer('assets/css/main.css')
const estilosPublicos = leer('assets/css/landing.css')
const vistasConResultados = [
  'components/CentroResultadosDeportivos.vue',
  'components/FranjaMarcadores.vue',
  'pages/partidos-hoy.vue',
  'pages/resultados/[id].vue',
  'pages/resultados/en-vivo.vue'
]

describe('HU-PERF-01 · alcance de hojas de estilo', () => {
  it('mantiene solo estilos base en la configuración CSS global de Nuxt', () => {
    expect(configuracionNuxt).toMatch(/css:\s*\[\s*'~\/assets\/css\/main\.css'\s*\]/)
    expect(configuracionNuxt).not.toContain('~/assets/css/landing.css')
    expect(configuracionNuxt).not.toContain('~/assets/css/resultados.css')
    expect(configuracionNuxt).not.toContain('~/assets/css/admin.css')
    expect(estilosBase).not.toContain('.admin-dashboard')
    expect(estilosBase).not.toContain('.dashboard-grid')
    expect(estilosPublicos).not.toContain('.admin-dashboard')
  })

  it('carga estilos públicos y administrativos desde sus layouts respectivos', () => {
    expect(layoutPublico).toContain('<style src="~/assets/css/landing.css"></style>')
    expect(layoutPublico).not.toContain('~/assets/css/admin.css')
    expect(layoutAdmin).toContain('<style src="~/assets/css/admin.css"></style>')
  })

  it('carga estilos deportivos solo desde las vistas y componentes que los usan', () => {
    for (const ruta of vistasConResultados) {
      expect(leer(ruta), ruta).toContain('<style src="~/assets/css/resultados.css"></style>')
    }
  })
})
