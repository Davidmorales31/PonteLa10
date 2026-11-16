import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import { createError, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { estadoProgramadorSocial, resolverConfiguracionMetaSocial } from '~/server/utils/configuracionSocialProduccion'

const d = vi.hoisted(() => ({ rpc: vi.fn(), cliente: vi.fn(), procesar: vi.fn(), latido: vi.fn(), cabecera: vi.fn() }))
vi.mock('~/server/utils/clienteSupabasePrivado', () => ({ obtenerClienteSupabasePrivado: d.cliente }))
vi.mock('~/server/utils/procesarColaSocial', () => ({ procesarColaSocial: d.procesar }))
const meta = { metaAccessToken: 'a'.repeat(30), metaFacebookPageAccessToken: 'b'.repeat(30), metaFacebookPageId: '1432682403259329', metaInstagramAccountId: '17841472510522793' }
const cliente = { rpc: d.rpc, from: () => ({ upsert: d.latido }) } as unknown as SupabaseClient
let ruta: (e: H3Event) => Promise<unknown>
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('setHeader', vi.fn())
  vi.stubGlobal('getHeader', d.cabecera)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://www.pont3la10.com' } }))
  ruta = (await import('~/server/api/internal/redes/procesar.post')).default
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.resetAllMocks()
  d.cliente.mockReturnValue(cliente)
  d.cabecera.mockReturnValue('Bearer ' + 'c'.repeat(64))
  d.rpc.mockImplementation(async nombre => ({ data: nombre === 'authorize_social_scheduler' ? true : meta, error: null }))
  d.latido.mockResolvedValue({ error: null })
})
describe('programador social en producción', () => {
  it('tolera latido de cron por minuto y rechaza vencidos o fechas futuras', () => {
    const ahora = Date.now()
    expect(estadoProgramadorSocial(new Date(ahora - 120_000).toISOString(), ahora)).toBe(true)
    expect(estadoProgramadorSocial(new Date(ahora - 181_000).toISOString(), ahora)).toBe(false)
    expect(estadoProgramadorSocial(new Date(ahora + 60_000).toISOString(), ahora)).toBe(false)
    expect(estadoProgramadorSocial(null, ahora)).toBe(false)
  })
  it('preserva configuración de sitio al completar credenciales privadas', async () => {
    const config = { metaAccessToken: '', public: { siteUrl: 'https://www.pont3la10.com' } }
    expect(await resolverConfiguracionMetaSocial(cliente, config)).toEqual({ ...config, ...meta })
  })
  it('usa entorno completo sin consultar Vault', async () => {
    expect(await resolverConfiguracionMetaSocial(cliente, meta)).toEqual(meta)
    expect(d.rpc).not.toHaveBeenCalled()
  })
  it('no acepta llamadas sin autorización ni procesa la cola', async () => {
    d.cabecera.mockReturnValue('')
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 401 })
    expect(d.rpc).not.toHaveBeenCalled()
    expect(d.procesar).not.toHaveBeenCalled()
  })
  it('no actualiza latido con un secreto incorrecto', async () => {
    d.rpc.mockResolvedValue({ data: false })
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 401 })
    expect(d.latido).not.toHaveBeenCalled()
  })
  it('rechaza configuración incompleta sin simular actividad', async () => {
    d.rpc.mockImplementation(async nombre => ({ data: nombre === 'authorize_social_scheduler' ? true : {} }))
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 503 })
    expect(d.latido).not.toHaveBeenCalled()
    expect(d.procesar).not.toHaveBeenCalled()
  })
  it('registra latido y consume solo una noticia aprobada', async () => {
    expect(await ruta({} as H3Event)).toEqual({ activo: true })
    expect(d.latido).toHaveBeenCalledOnce()
    expect(d.procesar).toHaveBeenCalledExactlyOnceWith(cliente, expect.objectContaining(meta), 'https://www.pont3la10.com')
  })
  it('mantiene Instagram operativo cuando Facebook requiere renovar acceso', async () => {
    d.rpc.mockImplementation(async nombre => ({ data: nombre === 'authorize_social_scheduler' ? true : { ...meta, metaFacebookPageAccessToken: undefined } }))
    expect(await ruta({} as H3Event)).toEqual({ activo: true })
    expect(d.procesar).toHaveBeenCalledOnce()
  })
})
