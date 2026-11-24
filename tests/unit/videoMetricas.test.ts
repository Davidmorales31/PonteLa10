import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import * as metricas from '../../scripts/video-metricas.mjs'
import * as youtube from '../../scripts/video-youtube.mjs'

type Fila = Record<string, unknown>
type Unido = { id: string, categoria: string, estructura: string, vistas: number, porcentajeMedio: number | null, suscriptores: number | null, titulo: string, proyecto: string }
const m = metricas as unknown as {
  claseDeGuion: (g: unknown) => { categoria: string, estructura: string }
  proyectosConVideo: (c: string) => Promise<{ id: string, proyecto: string, edicion: string, categoria: string, estructura: string }[]>
  unirConProyectos: (f: Fila[], p: unknown[]) => Unido[]
  rendimientoPorEstructura: (u: Unido[]) => { clave: string, videos: number, medianaVistas: number, medianaPorcentaje: number | null, suscriptores: number }[]
  decisiones: (u: Unido[], o?: { umbral?: number }) => { mediana: number, duplicar: { id: string, veces: number }[], revisar: { id: string }[], nota: string }
  informe: (o: Record<string, unknown>) => string
}
const yt = youtube as unknown as {
  ALCANCE: string, ALCANCE_ANALITICA: string
  urlAutorizacion: (o: Record<string, unknown>) => string
  filasDeReporte: (d: unknown) => Fila[]
  analiticaVideos: (o: Record<string, unknown>) => Promise<Fila[]>
}

const respuesta = (datos: unknown, estado = 200) => ({ ok: estado < 400, status: estado, json: async () => datos, headers: { get: () => null } })

describe('permiso opcional de YouTube Analytics', () => {
  const base = { clientId: 'id', redirect: 'http://127.0.0.1/cb', estado: 'e', desafio: 'd' }

  it('sin activarlo, la conexión pide exactamente el permiso de siempre', () => {
    expect(new URL(yt.urlAutorizacion(base)).searchParams.get('scope')).toBe(yt.ALCANCE)
  })

  it('al activarlo, pide además el permiso de solo lectura de Analytics', () => {
    expect(new URL(yt.urlAutorizacion({ ...base, analitica: true })).searchParams.get('scope')).toBe(`${yt.ALCANCE} ${yt.ALCANCE_ANALITICA}`)
    expect(yt.ALCANCE_ANALITICA).toContain('yt-analytics.readonly')
  })

  it('convierte las columnas y filas del reporte en objetos', () => {
    const datos = { columnHeaders: [{ name: 'video' }, { name: 'views' }, { name: 'averageViewPercentage' }], rows: [['abc', 1200, 41.5], ['def', 80, 18]] }
    expect(yt.filasDeReporte(datos)).toEqual([{ video: 'abc', views: 1200, averageViewPercentage: 41.5 }, { video: 'def', views: 80, averageViewPercentage: 18 }])
    expect(yt.filasDeReporte({})).toEqual([])
  })

  it('pide el reporte por video del canal y valida las fechas', async () => {
    let url = ''
    const transporte = async (u: string, opciones: { headers: Record<string, string> }) => { url = u; expect(opciones.headers.authorization).toBe('Bearer token'); return respuesta({ columnHeaders: [{ name: 'video' }], rows: [['a']] }) }
    expect(await yt.analiticaVideos({ acceso: 'token', transporte, desde: '2026-11-01', hasta: '2026-11-28' })).toEqual([{ video: 'a' }])
    const p = new URL(url).searchParams
    expect(p.get('ids')).toBe('channel==MINE')
    expect(p.get('dimensions')).toBe('video')
    expect(p.get('metrics')).toContain('averageViewPercentage')
    await expect(yt.analiticaVideos({ acceso: 't', transporte, desde: 'ayer', hasta: '2026-11-28' })).rejects.toThrow(/AAAA-MM-DD/)
  })

  it('si YouTube niega el acceso a Analytics, explica cómo activarlo', async () => {
    const transporte = async () => respuesta({ error: { errors: [{ reason: 'forbidden' }] } }, 403)
    await expect(yt.analiticaVideos({ acceso: 't', transporte, desde: '2026-11-01', hasta: '2026-11-28' })).rejects.toThrow(/PONT3LA10_YOUTUBE_ANALITICA/)
  })
})

describe('métricas propias y qué estructura rinde', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'metricas-'))
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }))
  const proyecto = (nombre: string, guion: unknown, estudio: unknown) => {
    mkdirSync(join(carpeta, nombre), { recursive: true })
    writeFileSync(join(carpeta, nombre, 'guion.json'), JSON.stringify(guion))
    writeFileSync(join(carpeta, nombre, 'estudio.json'), JSON.stringify(estudio))
  }

  it('clasifica cada guion: noticias por estructura, documental por formato, reel por formato', () => {
    expect(m.claseDeGuion({ estructura: 'top' })).toEqual({ categoria: 'noticias', estructura: 'top' })
    expect(m.claseDeGuion({})).toEqual({ categoria: 'noticias', estructura: 'directa' })
    expect(m.claseDeGuion({ tipo: 'documental', formato: 'historia-corta' })).toEqual({ categoria: 'documental', estructura: 'historia-corta' })
    expect(m.claseDeGuion({ tipo: 'documental' })).toEqual({ categoria: 'documental', estructura: 'biografia' })
    expect(m.claseDeGuion({ tipo: 'reel', formato: 'leyenda' })).toEqual({ categoria: 'reel', estructura: 'leyenda' })
  })

  it('el registro de apuestas sale solo de los proyectos que ya subieron su video', async () => {
    proyecto('2026-11-24', { estructura: 'directa' }, { youtube: { idVideo: 'aaaaaaaaaaa', titulo: 'Uno' } })
    proyecto('2026-11-24-internacional', { estructura: 'top', edicion: 'internacional' }, { youtube: { idVideo: 'bbbbbbbbbbb' } })
    proyecto('2026-11-25', { estructura: 'directa' }, {})
    proyecto('2026-11-27-documental-x', { tipo: 'documental', formato: 'epoca-club' }, { youtube: { idVideo: 'ccccccccccc' } })
    const lista = await m.proyectosConVideo(carpeta)
    expect(lista.map(p => p.id).sort()).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'])
    expect(lista.find(p => p.id === 'bbbbbbbbbbb')).toMatchObject({ edicion: 'internacional', categoria: 'noticias', estructura: 'top' })
    expect(lista.find(p => p.id === 'ccccccccccc')).toMatchObject({ categoria: 'documental', estructura: 'epoca-club' })
  })

  const proyectos = [
    { id: 'a', proyecto: 'p1', categoria: 'noticias', estructura: 'directa' }, { id: 'b', proyecto: 'p2', categoria: 'noticias', estructura: 'directa' },
    { id: 'c', proyecto: 'p3', categoria: 'noticias', estructura: 'top' }, { id: 'd', proyecto: 'p4', categoria: 'documental', estructura: 'biografia' },
    { id: 'e', proyecto: 'p5', categoria: 'noticias', estructura: 'top' }, { id: 'f', proyecto: 'p6', categoria: 'noticias', estructura: 'directa' }
  ]
  const filas = [
    { video: 'a', views: 1000, averageViewPercentage: 30, subscribersGained: 4 }, { video: 'b', views: 1200, averageViewPercentage: 34, subscribersGained: 6 },
    { video: 'c', views: 400, averageViewPercentage: 22, subscribersGained: 1 }, { video: 'd', views: 9000, averageViewPercentage: 48, subscribersGained: 80 },
    { video: 'e', views: 300, averageViewPercentage: 20, subscribersGained: 0 }, { video: 'f', views: 900, averageViewPercentage: 31, subscribersGained: 3 },
    { video: 'zzz', views: 50 }
  ]

  it('une las métricas con su proyecto y agrupa por estructura, de mayor a menor mediana', () => {
    const unidos = m.unirConProyectos(filas, proyectos)
    expect(unidos.find(u => u.id === 'zzz')?.proyecto).toBe('sin proyecto')
    const r = m.rendimientoPorEstructura(unidos)
    expect(r[0]).toMatchObject({ clave: 'documental / biografia', videos: 1, medianaVistas: 9000, suscriptores: 80 })
    expect(r.find(x => x.clave === 'noticias / directa')).toMatchObject({ videos: 3, medianaVistas: 1000, medianaPorcentaje: 31 })
    expect(r.find(x => x.clave === 'noticias / top')?.medianaVistas).toBe(350)
  })

  it('decide: duplica lo que pasa 3 veces la mediana, revisa lo que no llega a la mitad, y con pocos videos no decide', () => {
    const unidos = m.unirConProyectos(filas, proyectos)
    const d = m.decisiones(unidos)
    expect(d.mediana).toBe(900)
    expect(d.duplicar.map(u => u.id)).toEqual(['d'])
    expect(d.revisar.map(u => u.id).sort()).toEqual(['c', 'e', 'zzz'])
    expect(m.decisiones(unidos.slice(0, 3)).nota).toContain('Muy pocos')
  })

  it('el informe nombra la fuente, la tabla y qué hacer', () => {
    const unidos = m.unirConProyectos(filas, proyectos)
    const texto = m.informe({ unidos, desde: '2026-11-01', hasta: '2026-11-28', conAnalitica: true })
    expect(texto).toContain('YouTube Analytics (con retención)')
    expect(texto).toContain('| noticias / directa | 3 |')
    expect(texto).toContain('Sacar un segundo ángulo')
    expect(m.informe({ unidos, desde: 'a', hasta: 'b', conAnalitica: false })).toContain('solo vistas y me gusta')
  })
})
