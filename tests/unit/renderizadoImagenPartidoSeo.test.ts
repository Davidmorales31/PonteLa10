import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { crearCartelSvg } from '~/server/utils/cartelPartidoSeo'

const partidoBase: PartidoSeoPublico = {
  slug: 'atletico-nacional-vs-millonarios',
  competencia: 'liga-betplay',
  temporada: '2026',
  jornada: 'Fecha 17',
  fechaIso: '2026-10-05T21:00:00.000Z',
  local: 'Atlético Nacional',
  visitante: 'Millonarios',
  estado: 'scheduled',
  golesLocal: null,
  golesVisitante: null,
  estadio: 'Atanasio Girardot',
  ciudad: 'Medellín',
  fuenteOficialUrl: null,
  escudoLocal: null,
  escudoVisitante: null,
  verificadoEn: '2026-10-05T12:00:00.000Z'
}

describe('carteles sociales de partido', () => {
  it('renderiza las dimensiones OpenGraph e incrusta escudos locales reales', async () => {
    const escudoWebp = readFileSync(new URL('../../server/assets/escudos-liga-colombiana/atletico-nacional.webp', import.meta.url))
    const svg = await crearCartelSvg(partidoBase, 1200, 630, async (nombre) => {
      if (nombre === 'Atlético Nacional') return `data:image/webp;base64,${escudoWebp.toString('base64')}`
      return null
    })
    const imagen = await sharp(Buffer.from(svg)).png().toBuffer()
    const metadata = await sharp(imagen).metadata()

    expect(svg).toContain('data:image/webp;base64,')
    expect(metadata.width).toBe(1200)
    expect(metadata.height).toBe(630)
    expect(metadata.format).toBe('png')
  })

  it('mantiene iniciales seguras cuando no existe escudo local mapeado', () => {
    return crearCartelSvg({ ...partidoBase, local: 'Club inventado' }, 1200, 630, async () => null)
      .then((svg) => {
        expect(svg).toContain('>CI</text>')
        expect(svg).not.toContain('onerror=')
      })
  })
})
