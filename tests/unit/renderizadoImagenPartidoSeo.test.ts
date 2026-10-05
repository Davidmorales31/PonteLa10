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
  escudoLocal: null,
  escudoVisitante: null,
  verificadoEn: '2026-10-05T12:00:00.000Z'
}

describe('carteles sociales de partido', () => {
  it('renderiza las dimensiones OpenGraph e incrusta escudos locales reales', async () => {
    const svg = crearCartelSvg(partidoBase, 1200, 628)
    const imagen = await sharp(Buffer.from(svg)).png().toBuffer()
    const metadata = await sharp(imagen).metadata()

    expect(svg).toContain('data:image/webp;base64,')
    expect(metadata.width).toBe(1200)
    expect(metadata.height).toBe(628)
    expect(metadata.format).toBe('png')
  })

  it('mantiene iniciales seguras cuando no existe escudo local mapeado', () => {
    const svg = crearCartelSvg({ ...partidoBase, local: 'Club inventado' }, 1200, 628)

    expect(svg).toContain('>CI</text>')
    expect(svg).not.toContain('onerror=')
  })
})
