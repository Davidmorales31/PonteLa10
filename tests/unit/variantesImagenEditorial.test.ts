import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { subirImagenEditorialOptimizada } from '~/server/utils/almacenarImagenEditorial'
import { generarVariantesImagenEditorial } from '~/server/utils/variantesImagenEditorial'

describe('generarVariantesImagenEditorial', () => {
  it('genera WebP sin ampliar y conserva los anchos de candidato disponibles', async () => {
    const origen = await sharp({
      create: {
        width: 1000,
        height: 600,
        channels: 3,
        background: '#14345a'
      }
    }).png().toBuffer()

    const variantes = await generarVariantesImagenEditorial(origen)
    const anchos = await Promise.all(variantes.map(async (variante) => {
      const metadata = await sharp(variante.contenido).metadata()
      expect(metadata.format).toBe('webp')
      expect(variante.tamanoBytes).toBe(variante.contenido.byteLength)
      return metadata.width
    }))

    expect(anchos).toEqual([320, 640, 960])
  })

  it('no genera archivos mayores que una imagen de origen pequeña', async () => {
    const origen = await sharp({
      create: {
        width: 300,
        height: 180,
        channels: 3,
        background: '#14345a'
      }
    }).webp().toBuffer()

    await expect(generarVariantesImagenEditorial(origen)).resolves.toEqual([])
  })

  it('limpia objetos parciales solo cuando la ruta pertenece a una carga única', async () => {
    const origen = await sharp({
      create: {
        width: 1000,
        height: 600,
        channels: 3,
        background: '#14345a'
      }
    }).webp().toBuffer()
    const rutasSubidas: string[] = []
    const rutasEliminadas: string[][] = []
    const cliente = {
      storage: {
        from: () => ({
          upload: async (ruta: string) => {
            rutasSubidas.push(ruta)
            return ruta.endsWith('-960.webp')
              ? { error: { message: 'fallo temporal' } }
              : { error: null }
          },
          remove: async (rutas: string[]) => {
            rutasEliminadas.push(rutas)
            return { error: null }
          }
        })
      }
    } as unknown as SupabaseClient
    const imagen = {
      contenido: origen,
      tipoMime: 'image/webp' as const,
      ancho: 1000,
      alto: 600,
      tamanoBytes: origen.byteLength,
      hash: 'hash'
    }

    await expect(subirImagenEditorialOptimizada(
      cliente,
      'editorial-media',
      'usuario/2026/10/unico.webp',
      imagen,
      true
    )).rejects.toThrow('No se pudo almacenar una variante editorial.')

    expect(rutasEliminadas).toEqual([[
      'usuario/2026/10/unico.webp',
      'usuario/2026/10/unico-320.webp',
      'usuario/2026/10/unico-640.webp',
      'usuario/2026/10/unico-960.webp'
    ]])
    expect(rutasSubidas).toHaveLength(4)

    rutasEliminadas.length = 0
    rutasSubidas.length = 0

    await expect(subirImagenEditorialOptimizada(
      cliente,
      'editorial-media',
      'codex/2026/10/hash.webp',
      imagen
    )).rejects.toThrow('No se pudo almacenar una variante editorial.')

    expect(rutasEliminadas).toEqual([])
  })
})
