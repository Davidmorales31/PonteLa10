import { describe, expect, it } from 'vitest'
import { obtenerSrcsetMedioEditorial } from '~/utils/media/imagenesEditoriales'

const origen = 'https://proyecto.supabase.co'
const base = `${origen}/storage/v1/object/public/editorial-media/autor/2026/10/portada.webp`

describe('obtenerSrcsetMedioEditorial', () => {
  it('incluye solo variantes menores y el original con su ancho real', () => {
    expect(obtenerSrcsetMedioEditorial(base, origen, 404)).toBe([
      `${base.replace('.webp', '-320.webp')} 320w`,
      `${base} 404w`
    ].join(', '))
  })

  it('genera todos los candidatos sin superar un original de 2400 px', () => {
    expect(obtenerSrcsetMedioEditorial(base, origen, 2400)).toBe([
      `${base.replace('.webp', '-320.webp')} 320w`,
      `${base.replace('.webp', '-640.webp')} 640w`,
      `${base.replace('.webp', '-960.webp')} 960w`,
      `${base.replace('.webp', '-1280.webp')} 1280w`,
      `${base.replace('.webp', '-1920.webp')} 1920w`,
      `${base} 2400w`
    ].join(', '))
  })

  it('no expone srcset para hosts, esquemas, buckets o rutas ajenos', () => {
    const rutasInvalidas = [
      ['http://proyecto.supabase.co/storage/v1/object/public/editorial-media/a.webp', origen],
      ['https://otro.supabase.co/storage/v1/object/public/editorial-media/a.webp', origen],
      [`${origen}/storage/v1/object/public/private/a.webp`, origen],
      [`${origen}/storage/v1/object/public/editorial-media/%2e%2e/otro.webp`, origen],
      [`${origen}/storage/v1/object/public/editorial-media/a.webp?token=privado`, origen]
    ] as const

    for (const [url, proyecto] of rutasInvalidas) {
      expect(obtenerSrcsetMedioEditorial(url, proyecto, 1200)).toBeUndefined()
    }
  })

  it('rechaza anchos faltantes o fuera del límite de medios editoriales', () => {
    expect(obtenerSrcsetMedioEditorial(base, origen, null)).toBeUndefined()
    expect(obtenerSrcsetMedioEditorial(base, origen, 0)).toBeUndefined()
    expect(obtenerSrcsetMedioEditorial(base, origen, 2501)).toBeUndefined()
  })
})
