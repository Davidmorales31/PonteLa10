import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import * as graficos from '../../scripts/graficos-codex.mjs'

type Recurso = { id: string, categoria: string, ancho: number, alto: number, prioridad: number, escenas: string[], opaco?: boolean, descripcion: string }
type Catalogo = { carpeta: string, estilo: { tamanoMaximoKB: number, transparenciaMinima: number }, recursos: Recurso[] }
type Datos = { ancho: number, alto: number, tieneAlfa: boolean, pesoKB: number, transparente: number, magenta: number }

const cargar = graficos.cargarCatalogo as () => Promise<Catalogo>
const validar = graficos.validarCatalogo as (c: unknown) => string[]
const encargo = graficos.generarEncargo as (c: unknown, o?: { prioridad?: number }) => string
const evaluar = graficos.evaluarImagen as (d: Datos, r: Partial<Recurso>, e: Catalogo['estilo']) => { errores: string[], avisos: string[] }
const analizar = graficos.analizarArchivo as (ruta: string) => Promise<Datos>
const revisar = graficos.revisar as (c: Catalogo, o: { raiz: string, analizar?: (r: string) => Promise<Datos> }) => Promise<{ recurso: Recurso, estado: string }[]>

describe('catálogo de gráficos para Codex', () => {
  it('es válido, sin ids repetidos, y todas las escenas que cita existen en el pack', async () => {
    const catalogo = await cargar()
    expect(validar(catalogo)).toEqual([])
    const ids = catalogo.recursos.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const escena of new Set(catalogo.recursos.flatMap(r => r.escenas))) {
      expect(existsSync(join('videos/pack-pont3la10/compositions', `${escena}.html`)), `la escena «${escena}» no existe en el pack`).toBe(true)
    }
    expect(catalogo.recursos.filter(r => r.opaco).map(r => r.id).every(id => id.startsWith('fondo-'))).toBe(true)
  })

  it('detecta un catálogo con errores', () => {
    const malo = { recursos: [{ id: 'A b', categoria: 'otra', ancho: 0, alto: 10, prioridad: 3, descripcion: '', escenas: [] }, { id: 'x', categoria: 'iconos', ancho: 10, alto: 10, prioridad: 1, descripcion: 'd', escenas: ['intro'] }, { id: 'x', categoria: 'iconos', ancho: 10, alto: 10, prioridad: 1, descripcion: 'd', escenas: ['intro'] }] }
    const errores = validar(malo).join(' | ')
    expect(errores).toMatch(/Id inválido/)
    expect(errores).toMatch(/categoría desconocida/)
    expect(errores).toMatch(/medidas inválidas/)
    expect(errores).toMatch(/prioridad/)
    expect(errores).toMatch(/Id repetido: x/)
  })

  it('el encargo trae todas las reglas y cada gráfico, y se puede pedir solo la prioridad 1', async () => {
    const catalogo = await cargar()
    const completo = encargo(catalogo)
    for (const r of catalogo.recursos) expect(completo).toContain(`${r.categoria}/${r.id}.png`)
    for (const regla of ['Cero texto', 'magenta', 'canal alfa', '#00FF00', 'graficos-codex.mjs --revisar', 'No hagas commit']) expect(completo).toContain(regla)
    const soloUno = encargo(catalogo, { prioridad: 1 })
    expect(soloUno).toContain(`**${catalogo.recursos.filter(r => r.prioridad === 1).length} gráficos**`)
    expect(soloUno).not.toContain(catalogo.recursos.find(r => r.prioridad === 2)!.id)
  })
})

describe('revisión de lo que entrega Codex', () => {
  const estilo = { tamanoMaximoKB: 2500, transparenciaMinima: 0.02 }
  const recurso = { ancho: 800, alto: 800, descripcion: 'x' }
  const bien: Datos = { ancho: 800, alto: 800, tieneAlfa: true, pesoKB: 200, transparente: 0.6, magenta: 0 }

  it('acepta un PNG correcto y distingue errores de avisos', () => {
    expect(evaluar(bien, recurso, estilo)).toEqual({ errores: [], avisos: [] })
    expect(evaluar({ ...bien, ancho: 1600, alto: 1600 }, recurso, estilo)).toEqual({ errores: [], avisos: ['tamaño 1600×1600 en vez de 800×800'] })
  })

  it('rechaza lo que rompería el render: sin alfa, fondo pintado, proporción, peso y magenta', () => {
    expect(evaluar({ ...bien, tieneAlfa: false }, recurso, estilo).errores.join()).toMatch(/canal alfa/)
    expect(evaluar({ ...bien, transparente: 0 }, recurso, estilo).errores.join()).toMatch(/casi no tiene transparencia/)
    expect(evaluar({ ...bien, ancho: 1200 }, recurso, estilo).errores.join()).toMatch(/proporción distinta/)
    expect(evaluar({ ...bien, pesoKB: 4000 }, recurso, estilo).errores.join()).toMatch(/pesa 4000 KB/)
    expect(evaluar({ ...bien, magenta: 0.01 }, recurso, estilo).errores.join()).toMatch(/magenta/)
  })

  it('un fondo opaco a propósito no necesita transparencia', () => {
    expect(evaluar({ ...bien, tieneAlfa: false, transparente: 0 }, { ...recurso, opaco: true }, estilo).errores).toEqual([])
  })

  const carpeta = mkdtempSync(join(tmpdir(), 'graficos-'))
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }))

  it('mide imágenes reales: transparente, opaca con cuadriculado y con magenta', async () => {
    const circulo = Buffer.from('<svg width="200" height="200"><circle cx="100" cy="100" r="60" fill="#ffd800"/></svg>')
    await sharp(circulo).png().toFile(join(carpeta, 'bien.png'))
    await sharp({ create: { width: 200, height: 200, channels: 3, background: '#cccccc' } }).png().toFile(join(carpeta, 'opaca.png'))
    await sharp(Buffer.from('<svg width="200" height="200"><rect x="20" y="20" width="160" height="160" fill="#ff00ff"/></svg>')).png().toFile(join(carpeta, 'magenta.png'))
    const a = await analizar(join(carpeta, 'bien.png'))
    expect(a).toMatchObject({ ancho: 200, alto: 200, tieneAlfa: true, magenta: 0 })
    expect(a.transparente).toBeGreaterThan(0.6)
    const o = await analizar(join(carpeta, 'opaca.png'))
    expect(evaluar(o, { ancho: 200, alto: 200, descripcion: '' }, estilo).errores.join()).toMatch(/canal alfa/)
    const m = await analizar(join(carpeta, 'magenta.png'))
    expect(m.magenta).toBeGreaterThan(0.5)
  })

  it('revisar marca como «falta» lo no entregado y evalúa lo entregado', async () => {
    const catalogo: Catalogo = { carpeta: 'g', estilo, recursos: [
      { id: 'uno', categoria: 'iconos', ancho: 800, alto: 800, prioridad: 1, escenas: ['intro'], descripcion: 'x' },
      { id: 'dos', categoria: 'iconos', ancho: 800, alto: 800, prioridad: 1, escenas: ['intro'], descripcion: 'x' }
    ] }
    const filas = await revisar(catalogo, { raiz: carpeta, analizar: async () => bien })
    expect(filas.map(f => f.estado)).toEqual(['falta', 'falta'])
  })
})
