import { describe, expect, it } from 'vitest'
import * as descripcion from '../../scripts/video-descripcion.mjs'
import * as musica from '../../scripts/video-musica.mjs'
import * as encargo from '../../scripts/video-encargo-miniaturas.mjs'

interface Capitulo { inicio: number, texto: string }
const marcaTiempo = descripcion.marcaTiempo as unknown as (s: number) => string
const capitulos = descripcion.capitulos as unknown as (o: Record<string, unknown>) => Capitulo[]
const creditosFotos = descripcion.creditosFotos as unknown as (g: unknown, e?: unknown) => string[]
const descripcionYoutube = descripcion.descripcionYoutube as unknown as (o: Record<string, unknown>) => string
const licenciaPermitida = musica.licenciaPermitida as unknown as (l: string) => boolean
const filtroMezcla = musica.filtroMezcla as unknown as (o: { duracion: number, volumen?: number }) => string
const fotosDelEncargo = encargo.fotosDelEncargo as unknown as (g: unknown, e?: unknown) => Array<{ bloque: string, url: string, credito: string }>
const textoEncargo = encargo.textoEncargo as unknown as (o: Record<string, unknown>) => string

const guion = {
  fecha: '2026-11-18',
  titulos: ['¡América y Once Caldas jugarán la final de la Copa BetPlay!', 'Vigouroux le atajó el penal a Colombia y así cerró el año', 'Cuadrangulares de la Liga: Medellín y Santa Fe abren el viernes'],
  miniatura: { texto: 'FINAL DEFINIDA', resaltar: 'FINAL' },
  presentacion: { texto: 'Hoy en Pont3la10: la final de Copa y los cuadrangulares.' },
  bloques: [
    { id: 'b1', club: 'Selección Colombia', articuloSlug: 'nota-1', titular: 'Colombia cerró el año sin goles', planos: [{ imagen: 'https://x/1.jpg', credito: 'Photosport (vía AS)' }, { imagen: 'https://x/1.jpg', credito: 'Photosport (vía AS)' }] },
    { id: 'b2', club: 'Once Caldas', articuloSlug: 'nota-2', titular: 'Once y Nacional otra vez', planos: [{ imagen: 'https://x/2.jpg', credito: 'VizzorImage' }] },
    { id: 'b3', club: 'Cali', articuloSlug: 'nota-3', caraBreve: 'Si vas a Palmaseca, mira los precios.', planos: [] }
  ]
}
const manifiesto = { segmentos: [
  { id: 'gancho', inicio: 4.1 }, { id: 'b1-cara', inicio: 21.5 }, { id: 'b2-cara', inicio: 62 }, { id: 'b3-cara', inicio: 66 }, { id: 'pregunta', inicio: 240 }
] }

describe('descripción de YouTube', () => {
  it('formatea marcas de tiempo', () => {
    expect(marcaTiempo(0)).toBe('0:00')
    expect(marcaTiempo(75.9)).toBe('1:15')
    expect(marcaTiempo(3725)).toBe('1:02:05')
  })

  it('arma capítulos desde 0:00, separados al menos 10 s', () => {
    const lista = capitulos({ guion, manifiesto })
    expect(lista[0]).toEqual({ inicio: 0, texto: 'Lo más importante del día' })
    expect(lista.map(c => c.inicio)).toEqual([0, 21.5, 62, 240])
    expect(lista[1].texto).toBe('Selección Colombia: Colombia cerró el año sin goles')
  })

  it('no inventa capítulos si quedan menos de 3', () => {
    expect(capitulos({ guion: { bloques: [] }, manifiesto: { segmentos: [] } })).toEqual([])
  })

  it('reúne créditos únicos, enlaces con UTM y la atribución de la música', () => {
    expect(creditosFotos(guion, { fotosExtra: { b1: [{ ruta: 'assets/fotos/a.jpg', credito: 'Juan Pérez' }] } })).toEqual(['Photosport (vía AS)', 'Juan Pérez', 'VizzorImage'])
    const texto = descripcionYoutube({ guion, manifiesto, atribucionMusica: 'Música: «X» de Y (CC BY 3.0)' })
    expect(texto).toContain('0:00 Lo más importante del día')
    expect(texto).toContain('https://www.pont3la10.com/articulos/nota-2?utm_source=youtube')
    expect(texto).toContain('Fotos: Photosport (vía AS) · VizzorImage')
    expect(texto).toContain('Música: «X» de Y (CC BY 3.0)')
    expect(texto.length).toBeLessThanOrEqual(5000)
  })
})

describe('música', () => {
  it('solo acepta licencias libres para uso comercial y sin compartir igual', () => {
    for (const l of ['cc0', 'by', 'BY', 'pdm']) expect(licenciaPermitida(l)).toBe(true)
    for (const l of ['by-nc', 'by-sa', 'by-nd', 'by-nc-sa', '', 'sampling+']) expect(licenciaPermitida(l)).toBe(false)
  })

  it('mezcla con la voz como llave (la música baja sola al hablar) y normaliza a -14 LUFS', () => {
    const filtro = filtroMezcla({ duracion: 300, volumen: 0.3 })
    expect(filtro).toContain('sidechaincompress=threshold=0.004:ratio=16:level_sc=3')
    expect(filtro).toContain('afade=t=out:st=297.00:d=3')
    expect(filtro).toContain('loudnorm=I=-14')
    expect(filtro).toContain('volume=0.3')
  })
})

describe('encargo de miniaturas para Codex', () => {
  it('toma una foto distinta por noticia, con su crédito', () => {
    const fotos = fotosDelEncargo(guion)
    expect(fotos.map(f => f.bloque)).toEqual(['b1', 'b2'])
    expect(fotos[0].credito).toBe('Photosport (vía AS)')
    expect(fotosDelEncargo(guion, { fotosExtra: { b3: [{ ruta: 'assets/fotos/c.jpg', credito: 'Juan' }] } }).map(f => f.bloque)).toEqual(['b1', 'b2', 'b3'])
  })

  it('pide 3 variantes 1280×720 con fotos reales y prohíbe inventar personas o escenas', () => {
    const texto = textoEncargo({ guion, fotos: fotosDelEncargo(guion), conCara: true, carpeta: 'C:/x' })
    expect(texto).toContain('1280×720')
    expect(texto).toContain('miniatura-a.jpg')
    expect(texto).toContain('FINAL DEFINIDA')
    expect(texto).toContain('insumos/cara.jpg')
    expect(texto).toMatch(/no generes ni inventes personas/)
    expect(textoEncargo({ guion, fotos: [], conCara: false, carpeta: 'C:/x' })).toContain('no hay toma de cara')
  })
})
