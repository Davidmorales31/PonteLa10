import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('rutas históricas de partidos', () => {
  it.each(['donde-ver', 'como-quedo'])('redirige permanentemente %s al canonical', (ruta) => {
    const contenido = readFileSync(new URL(`../../pages/${ruta}/[slug].vue`, import.meta.url), 'utf8')
    expect(contenido).toContain('redirectCode: 301')
    expect(contenido).toContain('`/partidos/${data.value.partido.slug}`')
  })
})
