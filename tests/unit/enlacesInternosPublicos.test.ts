import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('enlaces internos públicos', () => {
  it('usa un enlace Nuxt explícito para una noticia relacionada navegable', () => {
    const componente = readFileSync(new URL(
      '../../components/editorial/TarjetaEnlaceInterno.vue',
      import.meta.url
    ), 'utf8')

    expect(componente).toContain('<NuxtLink')
    expect(componente).toContain(':to="`/articulos/${articulo.slug}`"')
    expect(componente).not.toContain("resolveComponent('NuxtLink')")
  })
})
