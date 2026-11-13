import { readFileSync } from 'node:fs'
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest'
import sharp from 'sharp'
import type { H3Event } from 'h3'
import { crearDiapositivaSocial } from '~/utils/editorial/publicacionesSociales'
const contexto = vi.hoisted(() => vi.fn())
vi.mock('~/server/utils/contextoPublicacionSocial', () => ({ contextoPublicacionSocial: contexto }))
let exportar: (evento: H3Event) => Promise<Buffer>
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (manejador: unknown) => manejador)
  exportar = (await import('~/server/api/admin/redes/[id]/exportar.post')).default as unknown as typeof exportar
})
beforeEach(() => {
  contexto.mockResolvedValue({ cliente: {}, dominio: 'www.pont3la10.com' })
  vi.stubGlobal('setHeader', vi.fn())
  vi.stubGlobal('createError', (opciones: object) => Object.assign(new Error(), opciones))
  vi.stubGlobal('useStorage', () => ({ getItemRaw: async (ruta: string) => readFileSync(new URL(`../../server/assets/${ruta}`, import.meta.url)) }))
})
afterAll(() => vi.unstubAllGlobals())
describe('ruta real de exportación backend', () => {
  it('genera un PNG CTA desde los assets empaquetados sin depender del navegador ni fuentes del sistema', async () => {
    vi.stubGlobal('readBody', async () => ({ diapositiva: crearDiapositivaSocial('La historia completa está en Pont3la10', null, 'cta'), formato: 'vertical' }))
    const png = await exportar({} as H3Event)
    const metadata = await sharp(png).metadata()
    expect(metadata).toMatchObject({ format: 'png', width: 1080, height: 1350 })
    expect((await sharp(png).stats()).channels[0]!.max).toBeGreaterThan(240)
    expect(contexto).toHaveBeenCalledWith({}, true)
  })
  it('no acepta URL arbitraria en lugar de medio editorial', async () => {
    vi.stubGlobal('readBody', async () => ({ diapositiva: { ...crearDiapositivaSocial('Noticia', null), imagenUrl: 'http://127.0.0.1/secreto' }, formato: 'vertical' }))
    await expect(exportar({} as H3Event)).rejects.toMatchObject({ statusCode: 422 })
  })
})
