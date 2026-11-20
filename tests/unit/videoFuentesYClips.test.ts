import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as generador from '../../scripts/video-generar-proyecto.mjs'
import * as reel from '../../scripts/video-generar-reel.mjs'
import * as redes from '../../scripts/video-redes-fuentes.mjs'

type Escena = { escena: string, inicio: number, duracion: number, variables?: Record<string, unknown>, mediaInicio?: number }
const repartirGalerias = generador.repartirGalerias as (d: number, f: Array<Record<string, unknown>>, r: boolean, u?: Map<string, number>, m?: number) => Array<{ espacios: Array<{ url: string }>, duracion: number }>
const planificar = generador.planificar as (g: unknown, o?: Record<string, unknown>) => { escenas: Escena[] }
const planificarReel = reel.planificarReel as (r: unknown, o?: Record<string, unknown>) => { escenas: Escena[] }
const publicacionX = redes.publicacionX as (u: string) => { usuario: string, id: string, url: string } | null
const publicacionesEnPagina = redes.publicacionesEnPagina as (h: string) => Array<{ usuario: string, id: string }>
const creditoDeRed = redes.creditoDeRed as (a: string, m?: string) => string
const mediosDePublicacionX = redes.mediosDePublicacionX as (u: string, o?: Record<string, unknown>) => Promise<null | { autor: string, fotos: Array<{ url: string }>, videos: Array<{ url: string, duracion: number }> }>

const palabras = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`).join(' ')
const bloque = (id: string) => ({ id, articuloSlug: `art-${id}`, club: 'Once Caldas', fuente: 'Win Sports', titular: `Titular ${id}`, caraBreve: palabras(10), voz: palabras(140), planos: [{ imagen: `https://x/${id}.jpg`, credito: 'Colprensa' }] })
const guion = { fecha: '2026-11-20', gancho: { texto: palabras(20) }, presentacion: { texto: palabras(60) }, bloques: ['b1', 'b2', 'b3'].map(bloque), preguntaFinal: '¿Qué opinan?', cierre: { texto: palabras(30) } }

/** Apariciones de cada imagen en todo el plan: galerías, clips, intro y cierre. */
function apariciones(escenas: Escena[]) {
  const cuenta = new Map<string, number>()
  const sumar = (url: unknown) => { if (url) cuenta.set(String(url), (cuenta.get(String(url)) || 0) + 1) }
  for (const e of escenas) {
    if (e.escena === 'galeria') for (let i = 1; i <= Number(e.variables?.cantidad); i++) sumar(e.variables?.[`foto${i}`])
    if (e.escena === 'clip') sumar(e.variables?.video)
    if (e.escena === 'intro' || e.escena === 'cierre') sumar(e.variables?.fondo)
  }
  return cuenta
}

describe('regla: ninguna imagen más de 3 veces por video', () => {
  it('alarga los espacios en vez de repetir una foto más de 3 veces', () => {
    const galerias = repartirGalerias(60, [{ url: 'a', credito: 'A' }], true)
    const espacios = galerias.flatMap(g => g.espacios)
    expect(espacios).toHaveLength(3)
    expect(galerias.reduce((s, g) => s + g.duracion, 0)).toBeCloseTo(60, 1)
    const usos = new Map([['a', 2]])
    expect(repartirGalerias(60, [{ url: 'a', credito: 'A' }], true, usos).flatMap(g => g.espacios)).toHaveLength(1)
    expect(usos.get('a')).toBe(3)
  })

  it('en el video completo ninguna foto pasa de 3 apariciones y cada noticia conserva la suya', () => {
    for (const repetirFotos of [true, false]) {
      const plan = planificar(guion, { ppm: 155, repetirFotos })
      for (const [url, n] of apariciones(plan.escenas)) expect(n, url).toBeLessThanOrEqual(3)
    }
    const plan = planificar(guion, { ppm: 155, repetirFotos: true })
    const usadas = apariciones(plan.escenas)
    for (const id of ['b1', 'b2', 'b3']) expect(usadas.get(`https://x/${id}.jpg`), id).toBeGreaterThan(0)
  })

  it('en un Reel ninguna foto nítida sale más de 3 veces', () => {
    const r = {
      id: 'r1', club: 'Pasto', fuente: 'Infobae',
      gancho: { texto: 'Al Pasto le quedan tres jugadores.', pantalla: 'SOLO 3', imagen: 'https://x/a.jpg', credito: 'A' },
      beats: Array.from({ length: 6 }, (_, i) => ({ id: `v${i + 1}`, texto: palabras(24), visual: { tipo: 'punch', imagen: 'https://x/a.jpg', credito: 'A' } })),
      cierre: { texto: 'Sigue a Ponte la 10.' }
    }
    // Como en el generador real, la versión desenfocada es otro archivo (foto-N-fondo.jpg).
    const plan = planificarReel(r, { ppm: 170, derivada: (ruta: string, tipo: string) => (tipo === 'fondo' ? `${ruta}#fondo` : ruta) })
    expect(plan.escenas.some(e => e.variables?.foto === 'https://x/a.jpg#fondo')).toBe(true)
    const nitidas = plan.escenas.filter(e => ['reel-gancho', 'reel-foto-punch', 'reel-foto-tarjeta'].includes(e.escena))
      .flatMap(e => [e.variables?.foto, e.variables?.foto2]).filter(f => f === 'https://x/a.jpg')
    expect(nitidas.length).toBeLessThanOrEqual(3)
  })
})

describe('clips de video en el video largo', () => {
  it('un clip ocupa su propio espacio, sin sonido y con crédito; si se repite, arranca más adelante', () => {
    const estudio = { fotosExtra: { b1: [{ ruta: 'assets/videos/auto-b1-x.mp4', tipo: 'video', duracion: 14, credito: '@BlessdOficial en X (vía El Universal)' }] } }
    const plan = planificar(guion, { ppm: 155, repetirFotos: true, estudio })
    const clips = plan.escenas.filter(e => e.escena === 'clip')
    expect(clips.length).toBeGreaterThanOrEqual(1)
    expect(clips[0].variables).toMatchObject({ video: 'assets/videos/auto-b1-x.mp4', credito: 'Video: @BlessdOficial en X (vía El Universal)' })
    if (clips[1]) expect(clips[1].mediaInicio).toBeGreaterThan(0)
    expect(clips.length).toBeLessThanOrEqual(3)
    const html = readFileSync('videos/pack-pont3la10/compositions/clip.html', 'utf8')
    expect(html).toMatch(/<video id="clip-video" class="clip"[^>]*muted/)
    expect(html).toContain('window.__timelines["clip"]')
  })
})

describe('fotos y videos de publicaciones de X', () => {
  it('reconoce publicaciones y descarta enlaces que no lo son', () => {
    expect(publicacionX('https://twitter.com/BlessdOficial/status/2123162827880112207?s=20')).toEqual({ usuario: 'BlessdOficial', id: '2123162827880112207', url: 'https://x.com/BlessdOficial/status/2123162827880112207' })
    for (const u of ['https://x.com/intent/tweet?text=hola', 'https://x.com/i/status/123456', 'https://evil.com/x.com/a/status/123456', 'https://x.com/BlessdOficial']) expect(publicacionX(u)).toBeNull()
    const html = '<blockquote class="twitter-tweet"><a href="https://twitter.com/_SamuelDuque/status/2123131833558999324">x</a></blockquote> <a href="https://x.com/_SamuelDuque/status/2123131833558999324?ref=1">otra vez</a> <a href="https://x.com/intent/tweet">compartir</a>'
    expect(publicacionesEnPagina(html).map(p => p.usuario)).toEqual(['_SamuelDuque'])
    expect(creditoDeRed('BlessdOficial', 'El Universal')).toBe('@BlessdOficial en X (vía El Universal)')
  })

  it('lee fotos y videos con la API pública y descarta lo sensible', async () => {
    const respuesta = (datos: unknown, ok = true) => ({ ok, json: async () => datos })
    const tweet = { author: { screen_name: 'BlessdOficial' }, text: 'Hola', media: { photos: [{ url: 'https://pbs.twimg.com/a.jpg', width: 1536, height: 2048 }], videos: [{ url: 'https://video.twimg.com/b.mp4?tag=1', duration: 5.9, width: 576, height: 1024 }] } }
    const llamadas: string[] = []
    const medios = await mediosDePublicacionX('https://x.com/BlessdOficial/status/2123162827880112207', { transporte: async (u: string) => { llamadas.push(u); return respuesta({ tweet }) } })
    expect(llamadas[0]).toBe('https://api.fxtwitter.com/BlessdOficial/status/2123162827880112207')
    expect(medios?.autor).toBe('BlessdOficial')
    expect(medios?.fotos[0].url).toBe('https://pbs.twimg.com/a.jpg')
    expect(medios?.videos[0]).toMatchObject({ url: 'https://video.twimg.com/b.mp4?tag=1', duracion: 5.9 })
    expect(await mediosDePublicacionX('https://x.com/a/status/123456', { transporte: async () => respuesta({ tweet: { ...tweet, possibly_sensitive: true } }) })).toBeNull()
    expect(await mediosDePublicacionX('https://x.com/a/status/123456', { transporte: async () => respuesta({}, false) })).toBeNull()
    expect(await mediosDePublicacionX('https://ejemplo.com', {})).toBeNull()
  })
})
