import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as generador from '../../scripts/documental-generar.mjs'
import * as mapas from '../../scripts/documental-mapa.mjs'
import * as musica from '../../scripts/video-musica.mjs'

type Escena = { escena: string, inicio: number, duracion: number, capa: number, variables?: Record<string, unknown>, mediaInicio?: number }
type Plan = {
  duracion: number, escenas: Escena[], segmentos: { id: string, inicio: number, fin: number, grabado: boolean, bloque: string | null }[],
  capitulos: { inicio: number, texto: string }[], tramosMusica: { clave: string, inicio: number, fin: number }[],
  usosFoto: Record<string, number>, proporcion: { foto: number, video: number, animacion: number }, recortes: { clave: string, segundos: number }[], avisos: string[], medios: unknown[]
}
const planificar = generador.planificarDocumental as (g: unknown, o?: unknown) => Plan
const guion = JSON.parse(readFileSync('videos/documentales/2026-11-27-vozinha/guion.json', 'utf8'))
const lugares = JSON.parse(readFileSync('config/lugaresDocumental.json', 'utf8')).lugares

const medio = (v: { tipo: string, credito?: string, licencia?: string, video?: string }) => v.tipo === 'foto'
  ? { ruta: 'assets/fotos/f.jpg', credito: v.credito }
  : v.tipo === 'video' ? { ruta: 'assets/clips/c.mp4', credito: v.credito, licencia: v.licencia, disponible: String(v.video).includes('Colo-Colo') ? 5 : 120 } : null
const mapa = (v: unknown) => { const r = mapas.planMapa(v, lugares) as { mapa: unknown }; return r.mapa ? { mapa: r.mapa, tierra: '' } : null }

describe('planificarDocumental', () => {
  const plan = planificar(guion, { medio, mapa })
  const base = plan.escenas.filter(e => e.capa === 1).sort((a, b) => a.inicio - b.inicio)

  it('cubre todo el video sin huecos ni encimados en la capa de imagen', () => {
    let fin = 0
    for (const e of base) {
      expect(Math.abs(e.inicio - fin)).toBeLessThan(0.05)
      fin = e.inicio + e.duracion
    }
    expect(Math.abs(fin - plan.duracion)).toBeLessThan(0.05)
    expect(plan.duracion).toBeGreaterThan(20 * 60)
  })

  it('respeta mitad fotos como máximo y 3 usos por foto', () => {
    expect(plan.proporcion.foto).toBeLessThanOrEqual(0.5)
    expect(plan.proporcion.video + plan.proporcion.animacion).toBeGreaterThanOrEqual(0.5)
    for (const usos of Object.values(plan.usosFoto)) expect(usos).toBeLessThanOrEqual(generador.MAXIMO_USOS_FOTO)
  })

  it('usa los mismos ids de tramo que el estudio y una tarjeta por acto', () => {
    expect(plan.segmentos.map(s => s.id)).toEqual([...guion.actos.flatMap((a: { capitulos: { id: string }[] }) => a.capitulos.map(c => `${c.id}-voz`)), 'cierre'])
    // Título tras la pregunta y una tarjeta por cada acto siguiente.
    expect(plan.escenas.filter(e => e.escena === 'doc-acto' && e.variables?.kicker)).toHaveLength(guion.actos.length)
    expect(plan.escenas.filter(e => e.escena === 'doc-titular' && e.variables?.sello === 'FALSO')).toHaveLength(1)
  })

  it('no pasa del largo de un clip corto y avanza dentro de cada clip', () => {
    const colo = plan.recortes.find(r => r.clave.includes('Colo-Colo'))
    expect(colo!.segundos).toBeLessThanOrEqual(5.01)
    const clips = plan.escenas.filter(e => e.escena === 'doc-clip' && String(e.variables?.credito).includes('Papdi'))
    expect(new Set(clips.map(c => c.mediaInicio)).size).toBeGreaterThan(1)
  })

  it('capítulos de YouTube desde 0:00 y música por acto pegada', () => {
    expect(plan.capitulos[0].inicio).toBe(0)
    expect(plan.capitulos).toHaveLength(15)
    expect(plan.tramosMusica.map(t => t.clave)).toEqual(['pregunta', 'origen', 'ascenso', 'crisis', 'resolucion', 'legado'])
    plan.tramosMusica.forEach((t, i, lista) => { if (i) expect(t.inicio).toBe(lista[i - 1].fin) })
    expect(plan.tramosMusica.at(-1)!.fin).toBe(plan.duracion)
  })

  it('la entrevista no rellena: alguien hablando a cámara solo sale en testimonios', () => {
    const entrevistas = guion.actos.flatMap((a: { capitulos: { visuales: { video?: string, entrevista?: boolean }[] }[] }) => a.capitulos.flatMap(c => c.visuales.filter(v => String(v.video).includes('ENTREVISTA') && v.tipo !== 'testimonio')))
    expect(entrevistas.length).toBeGreaterThan(0)
    for (const v of entrevistas) expect(v.entrevista).toBe(true)
    for (const r of plan.recortes) expect(entrevistas.some((v: { video: string, desde: number }) => r.clave === `video:${v.video}#${v.desde}`)).toBe(false)
  })

  it('testimonios: como máximo 3, con su voz y subtítulo, sin pisar la voz del narrador', () => {
    const capitulo = (id: string, extra: unknown[] = []) => ({ id, titulo: id, voz: 'uno dos tres cuatro cinco seis siete ocho nueve diez', visuales: [{ tipo: 'foto', imagen: 'f.jpg' }, ...extra] })
    const t = (desde: number) => ({ tipo: 'testimonio', video: 'e.webm', desde, hasta: desde + 6, texto: 'Hola', credito: 'X' })
    const g = { tipo: 'documental', protagonista: 'X', actos: [{ id: 'a', titulo: 'A', capitulos: [capitulo('c0', [t(10), t(30)]), capitulo('c1', [t(50)]), capitulo('c2', [t(70)])] }] }
    const conAudio = (v: { tipo: string }) => v.tipo === 'testimonio' ? { ruta: 'e.mp4', audio: 'a.m4a', credito: 'X', disponible: 100 } : { ruta: 'f.jpg' }
    const r = planificar(g, { medio: conAudio }) as Plan & { medios: { id: string, inicio: number, duracion: number }[] }
    const clips = r.escenas.filter(e => e.escena === 'doc-clip')
    expect(clips).toHaveLength(3)
    expect(clips[0].variables).toMatchObject({ subtitulo: 'Hola', quien: 'X' })
    expect(r.medios.filter(m => m.id.startsWith('testimonio-'))).toHaveLength(3)
    expect(r.avisos.join(' ')).toContain('se omite')
    for (const m of r.medios) for (const s of r.segmentos) expect(m.inicio >= s.fin - 0.01 || m.inicio + m.duracion <= s.inicio + 0.01).toBe(true)
    // Sin audio extraído, el testimonio no entra.
    const sinAudio = planificar(g, { medio: (v: { tipo: string }) => v.tipo === 'testimonio' ? { ruta: 'e.mp4' } : { ruta: 'f.jpg' } })
    expect(sinAudio.escenas.filter(e => e.escena === 'doc-clip')).toHaveLength(0)
  })

  it('un capítulo corto de material toma prestado del vecino en vez de estirar animaciones', () => {
    const g = { tipo: 'documental', protagonista: 'X', actos: [{ id: 'a', titulo: 'A', capitulos: [
      { id: 'c0', titulo: 'c0', voz: 'palabra '.repeat(200), visuales: [{ tipo: 'ficha', texto: '7 ATAJADAS' }] },
      { id: 'c1', titulo: 'c1', voz: 'palabra '.repeat(20), visuales: [{ tipo: 'video', video: 'b.webm', desde: 0 }] }
    ] }] }
    const r = planificar(g, { medio: (v: { tipo: string }) => v.tipo === 'video' ? { ruta: 'b.mp4', disponible: 400 } : null })
    const ficha = r.escenas.find(e => e.escena === 'doc-ficha')!
    expect(ficha.duracion).toBeLessThan(20)
    expect(r.avisos.join(' ')).toContain('de otros capítulos')
  })

  it('usa la duración real de las tomas grabadas', () => {
    const conVoz = planificar(guion, { medio, mapa, estudio: { grabaciones: { 'c00-voz': { archivo: 'tomas/c00.m4a', duracion: 50 } } } })
    expect(conVoz.segmentos[0]).toMatchObject({ inicio: 0, fin: 50, grabado: true })
    expect(conVoz.medios.filter((m: unknown) => !String((m as { id: string }).id).startsWith('testimonio-'))).toHaveLength(1)
  })

  it('sin medios ni animaciones deja una tarjeta y lo avisa', () => {
    const vacio = planificar({ tipo: 'documental', protagonista: 'X', actos: [{ id: 'pregunta', titulo: 'P', capitulos: [{ id: 'c00', titulo: 'a', voz: 'uno dos tres cuatro', visuales: [{ tipo: 'stock', busqueda: 'x' }] }] }] })
    expect(vacio.avisos.join(' ')).toContain('no tiene visuales')
    expect(vacio.escenas.some(e => e.escena === 'doc-acto')).toBe(true)
  })
})

describe('render híbrido', () => {
  const plan = planificar(guion, { medio, mapa }) as Plan & { clipsBase: { inicio: number, duracion: number, archivo: string, mediaInicio: number }[] }

  it('todas las escenas de imagen empiezan y terminan en un cuadro exacto', () => {
    for (const e of plan.escenas.filter(x => x.capa === 1)) {
      expect(Math.abs(e.inicio * 30 - Math.round(e.inicio * 30))).toBeLessThan(0.01)
      expect(Math.abs((e.inicio + e.duracion) * 30 - Math.round((e.inicio + e.duracion) * 30))).toBeLessThan(0.01)
    }
  })

  it('la suscripción nunca cae sobre el hueco de un clip', () => {
    const clips = plan.escenas.filter(e => e.escena === 'doc-clip')
    for (const s of plan.escenas.filter(e => e.escena === 'suscribete')) {
      for (const c of clips) expect(s.inicio + s.duracion <= c.inicio || s.inicio >= c.inicio + c.duracion).toBe(true)
    }
  })

  it('la pista de clips cubre todos los cuadros, sin huecos', () => {
    const tramos = generador.tramosBase(plan.clipsBase, plan.duracion) as { tipo: string, cuadros: number }[]
    expect(tramos.reduce((s, t) => s + t.cuadros, 0)).toBe(Math.round(plan.duracion * 30))
    expect(tramos.filter(t => t.tipo === 'clip')).toHaveLength(plan.clipsBase.length)
    const parcial = generador.tramosBase(plan.clipsBase, plan.duracion, { inicio: 25, fin: 115 }) as { cuadros: number }[]
    expect(parcial.reduce((s, t) => s + t.cuadros, 0)).toBe(90 * 30)
  })
})

describe('siguienteNumero', () => {
  it('no reutiliza el número de un archivo existente', () => {
    expect(generador.siguienteNumero(['assets/clips/clip-3.mp4', 'assets/clips/clip-12.mp4'])).toBe(13)
    expect(generador.siguienteNumero([])).toBe(1)
  })
})

describe('itemsFicha', () => {
  it('separa cifras y etiquetas', () => {
    expect(generador.itemsFicha('0-0 · 7 ATAJADAS · DEBUT 2012 · VICECAPITÁN')).toEqual([
      { valor: '0-0', etiqueta: '' }, { valor: '7', etiqueta: 'ATAJADAS' }, { valor: '2012', etiqueta: 'DEBUT' }, { valor: '', etiqueta: 'VICECAPITÁN' }
    ])
  })
})

describe('planMapa', () => {
  it('recorrido: un paso por lugar más el resumen, encuadres 16:9', () => {
    const { mapa: m, faltan } = mapas.planMapa({ tipo: 'mapa', recorrido: ['Mindelo', 'Luanda', 'Chisináu'] }, lugares) as { mapa: { ruta: boolean, pasos: { vista: number[], resumen?: boolean }[], puntos: unknown[] }, faltan: string[] }
    expect(faltan).toEqual([])
    expect(m.ruta).toBe(true)
    expect(m.pasos).toHaveLength(4)
    expect(m.pasos.at(-1)!.resumen).toBe(true)
    for (const p of m.pasos) expect(p.vista[2] / p.vista[3]).toBeCloseTo(16 / 9, 1)
  })

  it('avisa los lugares que no están en el diccionario', () => {
    const r = mapas.planMapa({ tipo: 'mapa', lugares: ['Cabo Verde', 'Atlántida'] }, lugares) as { faltan: string[] }
    expect(r.faltan).toEqual(['Atlántida'])
  })

  it('todos los lugares del guion de Vozinha tienen coordenadas', () => {
    const nombres = guion.actos.flatMap((a: { capitulos: { visuales: { tipo: string, lugares?: string[], recorrido?: string[] }[] }[] }) => a.capitulos.flatMap(c => c.visuales.filter(v => v.tipo === 'mapa').flatMap(v => v.lugares || v.recorrido || [])))
    for (const n of nombres) expect(lugares[n], n).toBeTruthy()
  })
})

describe('descripcionDocumental', () => {
  it('incluye capítulos con tiempos, fuentes y créditos con licencia', () => {
    const plan = planificar(guion, { medio, mapa })
    const texto = generador.descripcionDocumental({ guion, manifiesto: { capitulos: plan.capitulos } }) as string
    expect(texto).toContain('0:00 Atlanta, 15 de junio')
    expect(texto).toContain('https://www.khaleejtimes.com/')
    expect(texto).toContain('Video: Atlanta Falcons / Wikimedia Commons (CC BY 3.0)')
    expect(texto).toContain('Natural Earth')
    expect(texto.length).toBeLessThanOrEqual(5000)
  })
})

describe('planMusica del documental', () => {
  it('usa los tramos por acto del manifiesto', async () => {
    const r = await (musica.planMusica as (o: unknown) => Promise<{ ids: string[], tramos: { inicio: number, fin: number }[] } | null>)({
      guion: { tipo: 'documental' }, manifiesto: { tramosMusica: [{ clave: 'a', inicio: 0 }, { clave: 'b', inicio: 40 }] }, duracion: 100, semilla: 'x', disponibles: ['p1', 'p2', 'p3']
    })
    expect(r!.tramos).toEqual([{ clave: 'a', inicio: 0, fin: 40 }, { clave: 'b', inicio: 40, fin: 100 }])
    expect(new Set(r!.ids).size).toBe(2)
  })
})
