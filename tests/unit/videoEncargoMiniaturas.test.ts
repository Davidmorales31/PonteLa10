import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as encargo from '../../scripts/video-encargo-miniaturas.mjs'

const esTomaConVideo = encargo.esTomaConVideo as (a: unknown) => boolean
const crearEncargo = encargo.crearEncargo as (carpeta: string) => Promise<{ conCara: boolean, texto: string }>

describe('encargo de miniaturas para Codex', () => {
  it('solo las tomas con video sirven para sacar el fotograma de la cara', () => {
    for (const archivo of ['assets/grabaciones/gancho.mp4', 'gancho.WEBM', 'a/b.mov']) expect(esTomaConVideo(archivo)).toBe(true)
    for (const archivo of ['assets/grabaciones/gancho.m4a', 'gancho.mp3', '', null, undefined]) expect(esTomaConVideo(archivo)).toBe(false)
  })

  it('con el gancho solo en audio («Sin cámara») crea el encargo sin la cara en lugar de fallar', async () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'encargo-'))
    mkdirSync(join(carpeta, 'assets', 'grabaciones'), { recursive: true })
    writeFileSync(join(carpeta, 'assets', 'grabaciones', 'gancho.m4a'), 'audio')
    writeFileSync(join(carpeta, 'guion.json'), JSON.stringify({ fecha: '2026-11-19', bloques: [], miniatura: { texto: 'GOLAZO' } }))
    writeFileSync(join(carpeta, 'estudio.json'), JSON.stringify({ grabaciones: { gancho: { archivo: 'assets/grabaciones/gancho.m4a', duracion: 10 } } }))
    const r = await crearEncargo(carpeta)
    expect(r.conCara).toBe(false)
    expect(r.texto).toContain('GOLAZO')
  })
})
