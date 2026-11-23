import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as rubrica from '../../scripts/video-rubrica-reels.mjs'
import * as reels from '../../scripts/video-generar-reel.mjs'
import * as proyecto from '../../scripts/video-generar-proyecto.mjs'

type Reel = Record<string, unknown>
const config = JSON.parse(readFileSync('config/reelsDiario.json', 'utf8'))
const { atribucion } = JSON.parse(readFileSync('config/videoDiario.json', 'utf8'))
const evaluarReel = rubrica.evaluarReel as (r: Reel, c: unknown, a: unknown) => { aprobado: boolean, puntaje: number, obligatoriosFallidos: string[], duracionEstimadaSegundos: number }
const evaluarGuionReels = rubrica.evaluarGuionReels as (g: unknown, c: unknown, a: unknown) => { aprobado: boolean, problemas: string[] }
const planificarReel = reels.planificarReel as (r: Reel, o?: Record<string, unknown>) => { duracion: number, escenas: Array<{ escena: string, inicio: number, duracion: number, variables?: Record<string, unknown>, subtitulos?: Array<{ inicio: number, fin: number, palabras: Array<{ texto: string }> }> }>, sonidos: Array<{ archivo: string, inicio: number, duracion: number }>, segmentos: Array<{ id: string, tipo: string }>, resumenFotos: Array<{ clave: string, vacios: number }> }
const tiemposDeBeats = reels.tiemposDeBeats as (b: unknown[], p: unknown[], i: number, d: number) => Array<{ inicio: number, fin: number }>
const partirBeat = reels.partirBeat as (i: number, f: number, m?: number) => Array<{ inicio: number, fin: number }>
const alinearConGuion = reels.alinearConGuion as (t: string, p: Array<{ texto: string, inicio: number, fin: number }>, d: number) => Array<{ texto: string, inicio: number, fin: number }>
const htmlSubtitulos = reels.htmlSubtitulos as (h: string, g: unknown[], n: number) => string
const armarIndexReel = reels.armarIndexReel as (p: unknown, t: string) => string
const descripcionDeReel = reels.descripcionDeReel as (g: Reel, m?: string) => string

const foto = (n: number) => `https://ejemplo.test/foto-${n}.jpg`
function reelBueno(): Reel {
  return {
    id: 'r1', club: 'Deportivo Pasto', fuente: 'Infobae', rumor: false, articuloSlug: 'pasto-22-salidas',
    gancho: { texto: 'Al Deportivo Pasto le quedan solo tres jugadores.', pantalla: 'SOLO LE QUEDAN 3', resaltar: '3', imagen: foto(1), credito: 'Colprensa (vía Infobae)' },
    beats: [
      { id: 'v1', texto: 'Según Infobae, el club anunció la salida de veintidós de sus veinticinco inscritos.', visual: { tipo: 'dato', dato: { etiqueta: 'PLANTEL', valor: 22, sufijo: 'SALIDAS', descripcion: 'De 25, quedan 3' } } },
      { id: 'v2', texto: 'Los que siguen son Jonathan Perlaza, Patrick Preciado y el arquero Ederson Cabezas.', visual: { tipo: 'lista', lista: { titulo: 'Los que siguen', items: ['Perlaza', 'Preciado', 'Cabezas'] } } },
      { id: 'v3', texto: 'Pero ojo con el contexto: los jugadores reclamaban dos meses y medio sin sueldo.', visual: { tipo: 'punch', imagen: foto(2), credito: 'Vanguardia', pantalla: 'SIN SUELDO' } },
      { id: 'v4', rehook: true, texto: 'Por eso el Pasto terminó la liga con su equipo sub-veinte y perdió cinco a cero con Santa Fe.', visual: { tipo: 'tarjeta', imagen: foto(3), credito: 'Publimetro', imagen2: foto(4), credito2: 'El País' } },
      { id: 'v5', texto: 'Así que, para mí, el Pasto de 2027 se arma casi desde cero.', visual: { tipo: 'paneo', imagen: foto(5), credito: 'El País Cali' } }
    ],
    cierre: { texto: 'Sigue a Ponte la 10 para ver cómo se arma el Pasto, que hoy tiene solo tres jugadores.', cta: 'Sigue a Ponte la 10', bucle: true },
    titulo: 'Al Pasto le quedan 3 jugadores: así se desarmó el equipo', hashtags: ['#DeportivoPasto']
  }
}

describe('rúbrica de Reels con guion propio', () => {
  it('aprueba un Reel con gancho concreto, fuente, créditos y un solo llamado a la acción', () => {
    const r = evaluarReel(reelBueno(), config, atribucion)
    expect(r.obligatoriosFallidos).toEqual([])
    expect(r.aprobado).toBe(true)
    expect(r.duracionEstimadaSegundos).toBeGreaterThan(22)
  })

  it('rechaza ganchos con saludo, fotos sin crédito y rumores con sello OFICIAL', () => {
    const saludo = { ...reelBueno(), gancho: { ...(reelBueno().gancho as object), texto: 'Hola, en este video les cuento del Pasto.' } }
    expect(evaluarReel(saludo, config, atribucion).obligatoriosFallidos).toContain('gancho-sin-saludo')
    const sinCredito = reelBueno()
    ;(sinCredito.beats as Array<{ visual: Record<string, unknown> }>)[2].visual.credito = ''
    expect(evaluarReel(sinCredito, config, atribucion).obligatoriosFallidos).toContain('creditos')
    const rumor = { ...reelBueno(), rumor: true, alerta: 'OFICIAL' }
    expect(evaluarReel(rumor, config, atribucion).obligatoriosFallidos).toContain('rumor')
    const dosCta = reelBueno()
    ;(dosCta.beats as Array<{ texto: string }>)[0].texto += ' Síguenos.'
    expect(evaluarReel(dosCta, config, atribucion).obligatoriosFallidos).toContain('un-cta')
  })

  it('exige entre 3 y 5 Reels con ids r1, r2…', () => {
    expect(evaluarGuionReels({ reels: [reelBueno()] }, config, atribucion).problemas.join(' ')).toMatch(/hay 1 Reels/)
    const tres = ['r1', 'r2', 'r3'].map(id => ({ ...reelBueno(), id }))
    expect(evaluarGuionReels({ reels: tres }, config, atribucion).aprobado).toBe(true)
  })
})

describe('generador de Reels con guion propio', () => {
  it('reparte los beats según la voz y parte las fotos en planos de máximo 4 s', () => {
    const palabras = Array.from({ length: 40 }, (_, i) => ({ texto: `p${i}`, inicio: 10 + i * 0.5, fin: 10 + i * 0.5 + 0.4 }))
    const tiempos = tiemposDeBeats([{ texto: 'a b c d e f g h i j' }, { texto: 'a b c d e f g h i j' }], palabras, 10, 20)
    expect(tiempos[0]).toEqual({ inicio: 10, fin: 20 })
    expect(tiempos[1]).toEqual({ inicio: 20, fin: 30 })
    expect(tiemposDeBeats([{ texto: 'a b' }, { texto: 'c d' }], [], 0, 4)).toEqual([{ inicio: 0, fin: 2 }, { inicio: 2, fin: 4 }])
    const partes = partirBeat(0, 9.5, 4)
    expect(partes).toHaveLength(3)
    expect(Math.max(...partes.map(p => p.fin - p.inicio))).toBeLessThanOrEqual(4)
    expect(partirBeat(0, 4.3, 4)).toHaveLength(1)
  })

  it('usa el texto del guion en los subtítulos con los tiempos de la toma', () => {
    const dichas = [{ texto: 'Según', inicio: 0.1, fin: 0.4 }, { texto: 'Infovine,', inicio: 0.4, fin: 0.9 }, { texto: 'el', inicio: 0.9, fin: 1 }, { texto: 'Pasto', inicio: 1, fin: 1.4 }]
    const alineadas = alinearConGuion('Según Infobae, el Pasto', dichas, 1.6)
    expect(alineadas.map(p => p.texto)).toEqual(['Según', 'Infobae,', 'el', 'Pasto'])
    expect(alineadas[3].inicio).toBe(1)
    expect(alinearConGuion('algo totalmente distinto aquí', dichas, 1.6)).toBe(dichas)
  })

  it('arma gancho en el cuadro 0, solo fotos o clips a pantalla completa, capas, subtítulos y cierre', () => {
    const plan = planificarReel({ ...reelBueno(), rumor: true }, { ppm: 170 })
    const gancho = plan.escenas.find(e => e.escena === 'reel-gancho')!
    expect(gancho.inicio).toBe(0)
    expect(gancho.variables).toMatchObject({ texto: 'SOLO LE QUEDAN 3', resaltar: '3', etiqueta: 'DEPORTIVO PASTO', foto: foto(1) })
    const nombres = plan.escenas.map(e => e.escena)
    for (const escena of ['reel-foto-punch', 'reel-foto-paneo', 'reel-cta', 'reel-fuente', 'reel-subtitulos']) expect(nombres).toContain(escena)
    // Sin barra de progreso ni etiqueta fija del club (2026-11-22).
    for (const retirada of ['reel-progreso', 'reel-etiqueta']) expect(nombres).not.toContain(retirada)
    // Nada de gráficos a pantalla completa ni transiciones que tapen la imagen.
    for (const prohibida of reels.ESCENAS_PROHIBIDAS as string[]) expect(nombres).not.toContain(prohibida)
    expect(plan.escenas.find(e => e.escena === 'reel-alerta')?.variables?.texto).toBe('RUMOR')
    // El dato del guion queda como palabra clave pequeña sobre una foto, no como pantalla aparte.
    expect(plan.escenas.some(e => e.variables?.clave === '22 SALIDAS')).toBe(true)
    // El cierre muestra una foto nítida, no un fondo azul.
    expect(String(plan.escenas.find(e => e.escena === 'reel-cta')?.variables?.fondo)).toMatch(/foto-\d\.jpg$/)
    const visuales = plan.escenas.filter(e => e.escena.startsWith('reel-foto-'))
    expect(Math.max(...visuales.map(e => e.duracion))).toBeLessThanOrEqual(4.01)
    expect(plan.segmentos.map(s => s.id)).toEqual(['gancho', 'cuerpo-voz', 'cierre'])
    expect(plan.resumenFotos.filter(r => r.vacios)).toEqual([])
    const sub = plan.escenas.find(e => e.escena === 'reel-subtitulos')!
    expect(sub.subtitulos!.length).toBeGreaterThan(10)
    sub.subtitulos!.forEach((g, i, todos) => { if (todos[i + 1]) expect(g.fin).toBeLessThanOrEqual(todos[i + 1].inicio) })
    expect(Math.max(...sub.subtitulos!.map(g => g.palabras.length))).toBeLessThanOrEqual(3)
  })

  it('prioriza los clips de video del estudio sobre las fotos del beat', () => {
    const estudio = { fotosExtra: { v3: [{ ruta: 'assets/fotos/a.jpg', credito: 'X' }, { ruta: 'assets/fotos/clip.mp4', credito: '@club', tipo: 'video', duracion: 12 }] } }
    const plan = planificarReel(reelBueno(), { ppm: 170, estudio })
    const clips = plan.escenas.filter(e => e.escena === 'reel-clip')
    expect(clips[0].variables).toMatchObject({ video: 'assets/fotos/clip.mp4', credito: 'Video: @club' })
    // En su propio beat el clip va primero, antes que la foto.
    expect(clips.some(e => e.variables?.clave === 'SIN SUELDO')).toBe(true)
    expect(clips.length).toBeLessThanOrEqual(3)
  })

  it('escribe el index vertical con los subtítulos en su pista y sin efectos encimados en una misma pista', () => {
    const plan = planificarReel(reelBueno(), { ppm: 170 })
    const html = armarIndexReel(plan, 'Prueba')
    expect(html).toContain('data-width="1080" data-height="1920"')
    expect(html).toMatch(/data-composition-id="reel-subtitulos-1"[^>]*data-track-kind="captions"/)
    const pistas = new Map<string, Array<[number, number]>>()
    for (const m of html.matchAll(/<audio id="sfx-\d+"[^>]*data-start="([\d.]+)" data-duration="([\d.]+)" data-track-index="(\d+)"/g)) {
      const lista = pistas.get(m[3]) || []
      lista.push([Number(m[1]), Number(m[1]) + Number(m[2])])
      pistas.set(m[3], lista)
    }
    for (const lista of pistas.values()) lista.sort((a, b) => a[0] - b[0]).forEach((r, i) => { if (lista[i + 1]) expect(r[1]).toBeLessThanOrEqual(lista[i + 1][0] + 1e-6) })
    const plantilla = readFileSync('videos/pack-pont3la10/compositions/reel-subtitulos.html', 'utf8')
    const sub = htmlSubtitulos(plantilla, [{ inicio: 0.2, fin: 1, palabras: [{ texto: 'hola<', inicio: 0.2, fin: 0.5 }, { texto: 'pasto', inicio: 0.5, fin: 1 }] }], 1)
    expect(sub).toContain('id="rsub1-g1-w2"')
    expect(sub).toContain('HOLA&lt;')
    expect(sub).not.toContain('SE QUEDÓ')
  })

  it('la descripción de Shorts lleva la nota con UTM, los créditos y #Shorts', () => {
    const texto = descripcionDeReel({ ...reelBueno(), descripcion: 'El Pasto se quedó con tres.' })
    expect(texto).toContain('utm_source=shorts')
    expect(texto).toContain('Fotos: Colprensa (vía Infobae)')
    expect(texto).toMatch(/#Shorts/)
  })

  it('cada escena vertical del pack existe, tiene su prefijo y registra su línea de tiempo', () => {
    const prefijos = proyecto.PREFIJOS as Record<string, string>
    const archivos = readdirSync('videos/pack-pont3la10/compositions').filter(n => n.startsWith('reel-'))
    expect(archivos.length).toBeGreaterThanOrEqual(20)
    for (const archivo of archivos) {
      const nombre = archivo.replace('.html', '')
      const html = readFileSync(join('videos/pack-pont3la10/compositions', archivo), 'utf8')
      expect(prefijos[nombre], nombre).toBeTruthy()
      expect(html).toContain(`data-composition-id="${nombre}"`)
      expect(html).toContain(`window.__timelines["${nombre}"]`)
      for (const id of html.matchAll(/\sid="([^"]+)"/g)) if (id[1] !== 'root') expect(id[1].startsWith(prefijos[nombre]), `${nombre}: ${id[1]}`).toBe(true)
    }
  })
})
