import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { EquipoLigaPublico } from '~/server/utils/equiposLigaPublicos'
import { crearCartelEquipoSvg } from '~/server/utils/cartelEquipoSeo'

const equipoBase: EquipoLigaPublico = {
  slug: 'atletico-nacional',
  nombre: 'Atlético Nacional',
  escudo: '/images/escudos/liga-colombiana/atletico-nacional.png',
  actualizadoEn: '2026-10-08T12:00:00.000Z',
  clasificaciones: [{
    competencia: 'liga-betplay',
    temporada: '2026',
    fase: 'Todos contra todos',
    posicion: 2,
    jugados: 14,
    ganados: 8,
    empatados: 3,
    perdidos: 3,
    golesFavor: 22,
    golesContra: 12,
    diferencia: 10,
    puntos: 27,
    verificadoEn: '2026-10-08T12:00:00.000Z'
  }]
}

describe('carteles sociales de equipos colombianos', () => {
  it('genera un PNG 1200×630 con escudo local y tabla pública vigente', async () => {
    const escudoWebp = readFileSync(new URL('../../server/assets/escudos-liga-colombiana/atletico-nacional.webp', import.meta.url))
    const svg = await crearCartelEquipoSvg(equipoBase, 1200, 630, async () => `data:image/webp;base64,${escudoWebp.toString('base64')}`)
    const imagen = await sharp(Buffer.from(svg)).png().toBuffer()
    const metadata = await sharp(imagen).metadata()

    expect(svg).toContain('data:image/webp;base64,')
    expect(svg).toContain('Posición #2 · 27 puntos · 2026')
    expect(metadata).toMatchObject({ width: 1200, height: 630, format: 'png' })
  })

  it('escapa nombres y muestra un fallback si no hay escudo ni clasificación', async () => {
    const equipo = { ...equipoBase, nombre: '<Club & Amigos>', clasificaciones: [] }
    const svg = await crearCartelEquipoSvg(equipo, 1200, 630)

    expect(svg).toContain('&lt;Club &amp; Amigos&gt;')
    expect(svg).toContain('class="iniciales">&lt;A</text>')
    expect(svg).toContain('Calendario, resultados y noticias verificadas')
    expect(svg).not.toContain('<Club & Amigos>')
  })
})
