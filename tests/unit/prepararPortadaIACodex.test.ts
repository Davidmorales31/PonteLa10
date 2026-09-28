import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  maximoBytesPortadaIACodex,
  optimizarPortadaIACodex,
  prepararPayloadPortadaIACodex
} from '../../scripts/preparar-portada-ia-codex.mjs'
import { detectarMimeEditorial } from '../../scripts/preparar-portada-codex.mjs'

const metadatos = {
  titulo: 'Ilustración editorial de un estadio',
  alt: 'Escena genérica de un estadio iluminado antes de un partido'
}

describe('preparación de portadas generadas por IA para Codex', () => {
  it('optimiza a WebP de tamaño acotado y prepara el payload sin fingir crédito', async () => {
    const original = await sharp({
      create: { width: 1900, height: 1100, channels: 3, background: '#12253b' }
    }).png().toBuffer()
    const optimizada = await optimizarPortadaIACodex(original)
    const payload = prepararPayloadPortadaIACodex(optimizada, 'portada.png', metadatos)

    expect(detectarMimeEditorial(optimizada)).toBe('image/webp')
    expect(optimizada.length).toBeLessThanOrEqual(maximoBytesPortadaIACodex)
    expect(payload).toMatchObject({
      nombreOriginal: 'portada.png',
      tipoMime: 'image/webp',
      titulo: metadatos.titulo,
      alt: metadatos.alt
    })
    expect(payload).not.toHaveProperty('credito')
    expect(payload).not.toHaveProperty('urlFuente')
  })

  it('rechaza archivos falsos y metadatos inesperados', async () => {
    await expect(optimizarPortadaIACodex(Buffer.alloc(100, 3)))
      .rejects.toThrow('La portada IA debe ser JPEG, PNG o WebP válido.')
    expect(() => prepararPayloadPortadaIACodex(Buffer.alloc(80), 'cover.webp', metadatos))
      .toThrow('La portada IA optimizada debe ser un archivo WebP de hasta 2,4 MB.')
    expect(() => prepararPayloadPortadaIACodex(Buffer.alloc(100, 1), 'cover.webp', {
      ...metadatos,
      urlFuente: 'https://example.org/fuente'
    })).toThrow('La portada IA requiere un título y texto alternativo editorial válidos.')
  })
})
