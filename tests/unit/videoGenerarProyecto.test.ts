import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as generador from '../../scripts/video-generar-proyecto.mjs'

interface Escena { escena: string, inicio: number, duracion: number, capa: number, variables?: Record<string, unknown>, instancia?: string }
interface Segmento { tipo: 'cara' | 'voz', etiqueta: string, inicio: number, fin: number, texto: string }
interface Plan { duracion: number, escenas: Escena[], sonidos: Array<{ archivo: string, inicio: number }>, segmentos: Segmento[] }
interface Galeria { inicio: number, duracion: number, segundosPorFoto: number, espacios: Array<{ url: string, credito: string }> }

const planificar = generador.planificar as (guion: unknown, opciones?: Record<string, unknown>) => Plan
const repartirGalerias = generador.repartirGalerias as (duracion: number, fotos: Array<{ url: string, credito: string }>, repetir: boolean) => Galeria[]
const instanciarEscena = generador.instanciarEscena as (html: string, escena: string, n: number, duracionInterna?: number, variables?: Record<string, string>) => string
const armarIndex = generador.armarIndex as (plan: Plan, titulo: string) => string
const fechaLarga = generador.fechaLarga as (fecha: string) => string

const palabras = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`).join(' ')
const bloque = (id: string, extra: Record<string, unknown> = {}) => ({
  id, articuloSlug: `art-${id}`, club: 'Once Caldas', fuente: 'Win Sports', titular: `Titular ${id}`,
  caraBreve: palabras(10), voz: palabras(100),
  planos: [{ imagen: `https://x/${id}.jpg`, credito: 'Colprensa' }, { tipo: 'tarjeta', texto: 'dato' }],
  ...extra
})
const guion = {
  fecha: '2026-11-18',
  tituloVideo: 'Prueba',
  gancho: { texto: palabras(25) },
  presentacion: { texto: palabras(20) },
  bloques: [bloque('b1', { marcador: { local: 'CHI', visita: 'COL', golesLocal: '0', golesVisita: '0', estado: 'FINAL' } }), bloque('b2', { dato: { etiqueta: 'FASE REGULAR', valor: 40, sufijo: 'PTS', descripcion: 'Nacional primero' } }), bloque('b3')],
  preguntaFinal: '¿Quién gana?',
  cierre: { texto: palabras(18) }
}

describe('generador del video diario', () => {
  it('formatea la fecha larga en español', () => {
    expect(fechaLarga('2026-11-18')).toBe('MIÉRCOLES 18 DE NOVIEMBRE')
    expect(fechaLarga('nada')).toBe('')
  })

  it('reparte la voz en galerías de hasta 3 espacios y deja espacios vacíos sin foto', () => {
    const galerias = repartirGalerias(40, [{ url: 'a', credito: 'A' }], false)
    expect(galerias.map(g => g.espacios.length)).toEqual([3, 3])
    expect(galerias.flatMap(g => g.espacios).filter(e => e.url).length).toBe(1)
    expect(galerias.reduce((s, g) => s + g.duracion, 0)).toBeCloseTo(40, 1)
    const repetidas = repartirGalerias(40, [{ url: 'a', credito: 'A' }], true)
    expect(repetidas.flatMap(g => g.espacios).every(e => e.url === 'a')).toBe(true)
  })

  it('instancia una escena con ids, composición y timeline propios', () => {
    const html = readFileSync(new URL('../../videos/pack-pont3la10/compositions/galeria.html', import.meta.url), 'utf8')
    const copia = instanciarEscena(html, 'galeria', 2, 18)
    expect(copia).toContain('data-composition-id="galeria-2"')
    expect(copia).toContain('window.__timelines["galeria-2"]')
    expect(copia).not.toMatch(/id="gal-/)
    expect(copia).not.toMatch(/#gal-/)
    expect(copia).toContain('"#gal2-slot-"')
    expect(copia).toContain('class="clip" data-start="0" data-duration="18"')
    expect(() => instanciarEscena(html, 'inexistente', 1)).toThrow()
  })

  it('no altera data-composition-id cuando el prefijo de ids coincide con el nombre de la escena', () => {
    for (const escena of ['intro', 'cara', 'cierre', 'rotulo']) {
      const html = readFileSync(new URL(`../../videos/pack-pont3la10/compositions/${escena}.html`, import.meta.url), 'utf8')
      const copia = instanciarEscena(html, escena, 3)
      expect(copia).toContain(`data-composition-id="${escena}-3"`)
      expect(copia).toContain(`window.__timelines["${escena}-3"]`)
    }
  })

  it('reemplaza las fotos de ejemplo por la variable o por una imagen vacía', () => {
    const html = readFileSync(new URL('../../videos/pack-pont3la10/compositions/galeria.html', import.meta.url), 'utf8')
    const copia = instanciarEscena(html, 'galeria', 1, 10, { foto1: 'assets/fotos/foto-1.jpg', foto2: '', foto3: '' })
    expect(copia).toContain('src="assets/fotos/foto-1.jpg" data-var-src="foto1"')
    expect(copia).toContain('src="assets/vacio.png" data-var-src="foto2"')
    expect(copia).not.toContain('src="assets/foto-a.jpg"')
  })

  it('arma una línea de tiempo continua, siempre con imagen en la capa base', () => {
    const plan = planificar(guion, { ppm: 155 })
    const base = plan.escenas.filter(e => e.capa === 1).sort((a, b) => a.inicio - b.inicio)
    expect(base[0].escena).toBe('intro')
    expect(base.at(-1)?.escena).toBe('cierre')
    for (let i = 1; i < base.length; i++) expect(base[i].inicio).toBeCloseTo(base[i - 1].inicio + base[i - 1].duracion, 1)
    expect(plan.duracion).toBeCloseTo(base.at(-1)!.inicio + base.at(-1)!.duracion, 1)
    expect(plan.escenas.some(e => ['tarjeta-dato', 'marcador'].includes(e.escena))).toBe(false)
  })

  it('marca las tomas a cámara de apertura, cada noticia y cierre', () => {
    const plan = planificar(guion, { ppm: 155 })
    const caras = plan.segmentos.filter(s => s.tipo === 'cara').map(s => s.etiqueta)
    expect(caras).toEqual(['Gancho', 'Noticia 1 · toma a cámara', 'Noticia 2 · toma a cámara', 'Noticia 3 · toma a cámara', 'Cierre'])
    expect(plan.segmentos.every((s, i, l) => i === 0 || s.inicio >= l[i - 1].fin - 0.01)).toBe(true)
  })

  it('pone rótulo, marcador y cifra solo cuando el bloque los trae', () => {
    const plan = planificar(guion, { ppm: 155 })
    expect(plan.escenas.filter(e => e.escena === 'rotulo').length).toBe(4)
    expect(plan.escenas.filter(e => e.escena === 'marcador-mini').length).toBe(1)
    expect(plan.escenas.filter(e => e.escena === 'dato-mini').length).toBe(1)
    expect(plan.escenas.filter(e => e.escena === 'suscribete').length).toBe(1)
    expect(plan.sonidos.filter(s => s.archivo.startsWith('whoosh')).length).toBe(plan.escenas.filter(e => e.escena.startsWith('transicion')).length)
  })

  it('pone el suscríbete al inicio, justo después del gancho', () => {
    const plan = planificar(guion, { ppm: 155 })
    const gancho = plan.segmentos.find(s => s.etiqueta === 'Gancho')!
    const suscribete = plan.escenas.filter(e => e.escena === 'suscribete')
    expect(suscribete).toHaveLength(1)
    expect(suscribete[0].inicio).toBeCloseTo(gancho.fin, 2)
    expect(plan.sonidos.filter(s => s.archivo === 'clic').every(s => s.inicio < gancho.fin + 5)).toBe(true)
  })

  it('genera un index con ids únicos y variables escapadas', () => {
    const plan = planificar({ ...guion, bloques: [bloque('b1', { titular: "Once's final <b>" })] }, { ppm: 155 })
    const index = armarIndex(plan, 'Título')
    const ids = [...index.matchAll(/ id="([^"]+)"/g)].map(m => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    expect(index).toContain('&#39;')
    expect(index).not.toContain('<b>')
  })
})
