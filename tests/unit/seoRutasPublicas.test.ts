import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const paginas = [
  {
    tipo: 'home',
    archivos: ['../../pages/index.vue']
  },
  {
    tipo: 'artículo',
    archivos: ['../../pages/articulos/[slug].vue']
  },
  {
    tipo: 'partido',
    archivos: ['../../pages/partidos/[slug].vue']
  },
  {
    tipo: 'hub',
    archivos: ['../../pages/futbol-colombiano.vue', '../../components/publico/HubEditorialPublico.vue']
  },
  {
    tipo: 'equipo',
    archivos: ['../../pages/equipos/[slug].vue']
  },
  {
    tipo: 'competición',
    archivos: ['../../pages/competiciones/[slug].vue', '../../components/publico/PaginaCompeticionPublica.vue']
  }
]

describe('contrato SEO de páginas públicas', () => {
  it.each(paginas)('$tipo conecta metadatos y JSON-LD a la ruta canonical', ({ archivos }) => {
    const contenido = archivos
      .map(archivo => readFileSync(new URL(archivo, import.meta.url), 'utf8'))
      .join('\n')

    expect(contenido).toContain('useSeoPont3la10')
    expect(contenido).toContain('rutaCanonica')
    expect(contenido).toContain('titulo')
    expect(contenido).toContain('descripcion')
    expect(contenido).toContain('datosEstructurados')
  })
})
