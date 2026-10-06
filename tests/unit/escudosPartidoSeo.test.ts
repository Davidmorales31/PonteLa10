import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { obtenerEscudoPartidoSeo, obtenerRutaPublicaEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'

describe('escudos para carteles de Liga', () => {
  it('resuelve alias habituales de fixtures al archivo local del equipo', async () => {
    const webpEscudo = readFileSync(new URL('../../server/assets/escudos-liga-colombiana/leones.webp', import.meta.url))
    const getItem = vi.fn(async (_clave: string) => webpEscudo)
    const almacen = { getItem }

    const escudoBogota = await obtenerEscudoPartidoSeo('Bogotá', almacen)
    expect(escudoBogota).toContain('data:image/png;base64,')
    const imagenConvertida = Buffer.from(escudoBogota!.split(',')[1]!, 'base64')
    expect((await sharp(imagenConvertida).metadata()).format).toBe('png')
    expect(await obtenerEscudoPartidoSeo('Envigado FC', almacen)).toContain('data:image/png;base64,')
    expect(await obtenerEscudoPartidoSeo('Ind. Medellín', almacen)).toContain('data:image/png;base64,')
    expect(await obtenerEscudoPartidoSeo('Leones FC', almacen)).toContain('data:image/png;base64,')
    expect(getItem.mock.calls.map(([clave]) => clave)).toEqual([
      'escudos-liga-colombiana/bogota-fc.webp',
      'escudos-liga-colombiana/envigado.webp',
      'escudos-liga-colombiana/independiente-medellin.webp',
      'escudos-liga-colombiana/leones.webp'
    ])
  })

  it('expone un fallback público únicamente para escudos locales aprobados del torneo', () => {
    expect(obtenerRutaPublicaEscudoPartidoSeo('Leones FC'))
      .toBe('/images/escudos/liga-colombiana/leones.png')
    expect(obtenerRutaPublicaEscudoPartidoSeo('Equipo desconocido')).toBeNull()
  })
})
