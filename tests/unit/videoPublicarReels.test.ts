import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as publicar from '../../scripts/video-publicar-reels.mjs'

interface Llamada { metodo: string, ruta: string, cuerpo?: Record<string, unknown> }
interface Cliente { llamar: (metodo: string, ruta: string, cuerpo?: unknown) => Promise<unknown> }
interface Resultado { reel: string, publicacionId: string, estado: string, fecha: string | null }

const validarFecha = publicar.validarFecha as (fecha: string, ahora?: number) => string
const escalonar = publicar.escalonar as (inicio: string, cada: number, cantidad: number) => string[]
const claveReel = publicar.claveReel as (p: string, id: string, creado: string) => string
const textosReel = publicar.textosReel as (d: string) => { facebook: string, instagram: string }
const tituloInterno = publicar.tituloInterno as (r: { id: string, club?: string, descripcion?: string }) => string
const destinoPermitido = publicar.destinoPermitido as (base: string) => boolean
const crearClienteRedes = publicar.crearClienteRedes as (o: { llave?: string, base?: string, fetchFn?: unknown }) => Cliente
const publicarReel = publicar.publicarReel as unknown as (o: Record<string, unknown>) => Promise<Resultado>
const cancelarProgramacionReel = publicar.cancelarProgramacionReel as unknown as (o: Record<string, unknown>) => Promise<{ estado: string }>
const refrescarEstados = publicar.refrescarEstados as unknown as (o: Record<string, unknown>) => Promise<Record<string, { estado: string }>>
const leerEstadoPublicaciones = publicar.leerEstadoPublicaciones as (c: string) => Promise<Record<string, { estado: string, publicacionId: string }>>

const AHORA = Date.parse('2026-11-18T12:00:00-05:00')
const descripcion = 'Colombia cerró el año sin goles\n\nResumen de la nota.\n\nNota completa: https://www.pont3la10.com/articulos/mi-nota?x=1\n\nFoto: Photosport (vía AS Colombia)\n\n#Pont3la10'
const reel = { id: 'b1', archivo: 'renders/reels/reel-1-b1.mp4', club: 'Selección Colombia', descripcion }

let carpeta = ''
let llamadas: Llamada[] = []
let subidas: Array<{ url: string, bytes: number }> = []

function clienteSimulado(opciones: { listo?: boolean, estadoApi?: string, falla?: string } = {}): Cliente {
  return {
    llamar: async (metodo, ruta, cuerpo) => {
      llamadas.push({ metodo, ruta, cuerpo: cuerpo as Record<string, unknown> })
      if (opciones.falla && ruta.includes(opciones.falla)) throw Object.assign(new Error('Redes rechazó la operación (limite_excedido): cupo'), { estado: 429 })
      if (ruta === '/medios/subidas') return { id: 'medio-1', subida: { metodo: 'PUT', url: 'https://storage.example/subida', encabezados: { 'content-type': 'video/mp4' } } }
      if (ruta === '/publicaciones' && metodo === 'POST') return { id: 'pub-1' }
      if (ruta === '/publicaciones/pub-1' && metodo === 'GET') return { revision: 3, estado: opciones.estadoApi || 'draft' }
      if (ruta.endsWith('/validar')) return opciones.listo === false ? { listo: false, motivos: ['Falta algo'] } : { listo: true, motivos: [] }
      return {}
    }
  }
}
const fetchSubida = async (url: string, init: { body: Buffer }) => { subidas.push({ url, bytes: init.body.length }); return { ok: true, status: 200 } }

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'reel-'))
  mkdirSync(join(carpeta, 'renders', 'reels'), { recursive: true })
  writeFileSync(join(carpeta, reel.archivo), Buffer.alloc(5000, 1))
  llamadas = []
  subidas = []
})
afterEach(() => rmSync(carpeta, { recursive: true, force: true }))

describe('publicación de Reels en redes', () => {
  it('valida que la fecha sea futura (10 min) y dentro de 30 días', () => {
    expect(validarFecha('2026-11-18T12:05:00-05:00', AHORA)).toContain('10 minutos')
    expect(validarFecha('2026-11-18T12:30:00-05:00', AHORA)).toBe('')
    expect(validarFecha('2026-12-30T12:00:00-05:00', AHORA)).toContain('30 días')
    expect(validarFecha('mañana', AHORA)).toContain('no es válida')
    expect(validarFecha('', AHORA)).toContain('no es válida')
  })

  it('escalona las horas y arma claves, títulos y textos estables', () => {
    expect(escalonar('2026-11-19T12:30:00.000Z', 3, 3)).toEqual(['2026-11-19T12:30:00.000Z', '2026-11-19T15:30:00.000Z', '2026-11-19T18:30:00.000Z'])
    expect(escalonar('nada', 3, 3)).toEqual([])
    expect(claveReel('2026-11-18', 'b1', '2026-11-18T17:24:40.769Z')).toMatch(/^[A-Za-z0-9_.:-]{8,100}$/)
    expect(tituloInterno(reel)).toBe('Reel · Selección Colombia · Colombia cerró el año sin goles')
    const textos = textosReel(descripcion)
    expect(textos.facebook).toContain('https://www.pont3la10.com/articulos/mi-nota')
    expect(textos.instagram).toContain('Nota completa en pont3la10.com')
    expect(textos.instagram).not.toContain('https://')
    expect(textos.instagram.length).toBeLessThanOrEqual(2200)
  })

  it('exige llave y solo acepta destinos del propio sitio', () => {
    expect(() => crearClienteRedes({ llave: '' })).toThrow(/llave de redes/)
    expect(destinoPermitido('https://www.pont3la10.com/api/agentes/redes/v1')).toBe(true)
    expect(destinoPermitido('http://www.pont3la10.com/api')).toBe(false)
    expect(destinoPermitido('https://malo.example.com/api')).toBe(false)
    expect(() => crearClienteRedes({ llave: 'p3l_x', base: 'https://malo.example.com/api' })).toThrow(/no permitido/)
  })

  it('sube el video, crea la publicación de tipo video, valida y programa', async () => {
    const r = await publicarReel({ proyecto: '2026-11-18', carpeta, reel, creado: '2026-11-18T17:24:40.769Z', modo: 'programar', fecha: '2026-11-19T07:30:00-05:00', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA })
    expect(r).toMatchObject({ reel: 'b1', publicacionId: 'pub-1', estado: 'programada', fecha: '2026-11-19T12:30:00.000Z' })
    expect(subidas).toEqual([{ url: 'https://storage.example/subida', bytes: 5000 }])
    const orden = llamadas.map(l => `${l.metodo} ${l.ruta}`)
    expect(orden).toEqual(['POST /medios/subidas', 'POST /medios/subidas/medio-1/confirmar', 'POST /publicaciones', 'GET /publicaciones/pub-1', 'POST /publicaciones/pub-1/validar', 'POST /publicaciones/pub-1/programar'])
    const creada = llamadas.find(l => l.ruta === '/publicaciones')!.cuerpo!
    expect(creada).toMatchObject({ tipo: 'video', destinos: ['facebook', 'instagram'], videoMedioId: 'medio-1' })
    expect((creada.descripcion as { instagram: string }).instagram).not.toContain('https://')
    expect(llamadas.at(-1)!.cuerpo).toMatchObject({ id: 'pub-1', revision: 3, fecha: '2026-11-19T12:30:00.000Z' })
    expect((await leerEstadoPublicaciones(carpeta)).b1).toMatchObject({ estado: 'programada', publicacionId: 'pub-1' })
  })

  it('no publica ni programa si la fecha no es válida, y no sube nada', async () => {
    await expect(publicarReel({ proyecto: 'p', carpeta, reel, creado: 'x', modo: 'programar', fecha: '2026-11-18T12:05:00-05:00', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA })).rejects.toThrow(/10 minutos/)
    expect(llamadas).toEqual([])
    expect(subidas).toEqual([])
  })

  it('deja un borrador sin fecha y lo reutiliza sin volver a subir el video', async () => {
    const base = { proyecto: '2026-11-18', carpeta, reel, creado: '2026-11-18T17:24:40.769Z', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA }
    expect((await publicarReel({ ...base, modo: 'borrador' })).estado).toBe('borrador')
    expect(llamadas.some(l => l.ruta.endsWith('/programar'))).toBe(false)
    llamadas = []
    const r = await publicarReel({ ...base, modo: 'programar', fecha: '2026-11-19T07:30:00-05:00' })
    expect(r.estado).toBe('programada')
    expect(llamadas.some(l => l.ruta === '/medios/subidas')).toBe(false)
    expect(subidas).toHaveLength(1)
  })

  it('rechaza programar dos veces, o un Reel ya publicado', async () => {
    const base = { proyecto: '2026-11-18', carpeta, reel, creado: '2026-11-18T17:24:40.769Z', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA }
    await publicarReel({ ...base, modo: 'programar', fecha: '2026-11-19T07:30:00-05:00' })
    await expect(publicarReel({ ...base, modo: 'programar', fecha: '2026-11-19T09:30:00-05:00' })).rejects.toThrow(/ya está programado/)
    writeFileSync(join(carpeta, 'renders', 'reels', 'publicaciones.json'), JSON.stringify({ b1: { publicacionId: 'pub-1', clave: claveReel('2026-11-18', 'b1', '2026-11-18T17:24:40.769Z'), estado: 'publicada' } }))
    await expect(publicarReel({ ...base, modo: 'programar', fecha: '2026-11-19T09:30:00-05:00' })).rejects.toThrow(/ya se publicó/)
  })

  it('un Reel regenerado se trata como nuevo (otra clave) y vuelve a subirse', async () => {
    const base = { proyecto: '2026-11-18', carpeta, reel, cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA }
    await publicarReel({ ...base, creado: '2026-11-18T17:24:40.769Z', modo: 'borrador' })
    await publicarReel({ ...base, creado: '2026-11-18T18:50:00.000Z', modo: 'borrador' })
    expect(subidas).toHaveLength(2)
  })

  it('pide aprobación humana con la hora sugerida', async () => {
    const r = await publicarReel({ proyecto: '2026-11-18', carpeta, reel, creado: 'x', modo: 'aprobacion', fecha: '2026-11-19T07:30:00-05:00', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA })
    expect(r.estado).toBe('aprobacion')
    expect(llamadas.at(-1)).toMatchObject({ ruta: '/publicaciones/pub-1/solicitar-aprobacion' })
    expect(llamadas.at(-1)!.cuerpo).toMatchObject({ revision: 3, horaSugerida: '2026-11-19T12:30:00.000Z' })
  })

  it('no programa una publicación que la validación rechaza', async () => {
    await expect(publicarReel({ proyecto: 'p', carpeta, reel, creado: 'x', modo: 'programar', fecha: '2026-11-19T07:30:00-05:00', cliente: clienteSimulado({ listo: false }), fetchFn: fetchSubida, ahora: AHORA })).rejects.toThrow(/Falta algo/)
    expect(llamadas.some(l => l.ruta.endsWith('/programar'))).toBe(false)
  })

  it('propaga el límite diario de la llave sin dejar el Reel marcado como programado', async () => {
    await expect(publicarReel({ proyecto: 'p', carpeta, reel, creado: 'x', modo: 'programar', fecha: '2026-11-19T07:30:00-05:00', cliente: clienteSimulado({ falla: '/programar' }), fetchFn: fetchSubida, ahora: AHORA })).rejects.toThrow(/cupo/)
    expect((await leerEstadoPublicaciones(carpeta)).b1.estado).toBe('borrador')
  })

  it('falla con claridad si el archivo no existe o la subida es rechazada', async () => {
    await expect(publicarReel({ proyecto: 'p', carpeta, reel: { ...reel, archivo: 'renders/reels/nada.mp4' }, creado: 'x', modo: 'borrador', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA })).rejects.toThrow(/no existe/)
    await expect(publicarReel({ proyecto: 'p', carpeta, reel, creado: 'x', modo: 'borrador', cliente: clienteSimulado(), fetchFn: async () => ({ ok: false, status: 403 }), ahora: AHORA })).rejects.toThrow(/HTTP 403/)
  })

  it('cancela una programación y refresca el estado real desde la API', async () => {
    const base = { proyecto: '2026-11-18', carpeta, reel, creado: 'x', cliente: clienteSimulado(), fetchFn: fetchSubida, ahora: AHORA }
    await publicarReel({ ...base, modo: 'programar', fecha: '2026-11-19T07:30:00-05:00' })
    expect((await cancelarProgramacionReel({ carpeta, reel, cliente: clienteSimulado() })).estado).toBe('borrador')
    await expect(cancelarProgramacionReel({ carpeta, reel, cliente: clienteSimulado() })).rejects.toThrow(/no está programado/)
    await publicarReel({ ...base, modo: 'programar', fecha: '2026-11-19T07:30:00-05:00' })
    const estados = await refrescarEstados({ carpeta, cliente: clienteSimulado({ estadoApi: 'published' }) })
    expect(estados.b1.estado).toBe('publicada')
    expect(JSON.parse(readFileSync(join(carpeta, 'renders', 'reels', 'publicaciones.json'), 'utf8')).b1.estado).toBe('publicada')
  })
})
