import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError, type H3Event } from 'h3'

const d = vi.hoisted(() => ({ contexto: vi.fn(), origen: vi.fn(), privado: vi.fn(), leer: vi.fn(), medios: vi.fn(),
  renderizar: vi.fn(), verificar: vi.fn(), consultar: vi.fn(), esperar: vi.fn(), rpc: vi.fn(), cuerpo: vi.fn(),
  subir: vi.fn(), firmar: vi.fn(), eliminar: vi.fn() }))
vi.mock('~/server/utils/contextoPublicacionSocial', () => ({ contextoPublicacionSocial: d.contexto }))
vi.mock('~/server/utils/contextoOAuthSocial', () => ({ clienteOAuthSocial: d.privado, validarOrigenOAuthSocial: d.origen }))
vi.mock('~/server/utils/repositorioPublicacionesSociales', () => ({ leerBorradorSocial: d.leer, validarMediosSociales: d.medios }))
vi.mock('~/server/utils/renderizadorPublicacionSocial', () => ({ renderizarDiapositivaSocial: d.renderizar }))
vi.mock('~/server/utils/publicacionMeta', async original => ({ ...await original<typeof import('~/server/utils/publicacionMeta')>(),
  verificarCuentaMeta: d.verificar, consultarMeta: d.consultar, esperarContenedorMeta: d.esperar }))
vi.mock('sharp', () => ({ default: () => ({ flatten: () => ({ jpeg: () => ({ toBuffer: async () => Buffer.from('jpeg-prueba') }) }) }) }))
const id = '33333333-3333-4333-8333-333333333333'
const reservaId = '44444444-4444-4444-8444-444444444444'
const claimId = '55555555-5555-4555-8555-555555555555'
const documento = { formato: 'cuadrado', textos: { facebook: 'Texto Facebook', instagram: 'Texto Instagram' },
  diapositivas: [{ id: 'imagen' }] }
const articulo = { id, estado: 'published', tieneVersionPublica: true, versionBloqueo: 2 }
let ruta: (evento: H3Event) => Promise<unknown>
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('readBody', d.cuerpo)
  vi.stubGlobal('useRuntimeConfig', () => ({}))
  ruta = (await import('~/server/api/admin/redes/[id]/publicar-meta.post')).default as unknown as typeof ruta
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.resetAllMocks()
  d.contexto.mockResolvedValue({ cliente: {}, articulo, urlCanonica: 'https://www.pont3la10.com/articulos/prueba', contexto: { usuario: { id } } })
  d.cuerpo.mockResolvedValue({ confirmar: true, destino: 'facebook', revision: 1, versionArticulo: 2 })
  d.leer.mockResolvedValue({ borrador: { revision: 1, documento } })
  d.verificar.mockResolvedValue({ id: '1432682403259329', token: 'privado' })
  d.renderizar.mockResolvedValue({ bytes: Buffer.from('png') })
  d.consultar.mockImplementation(async (_token, destino) => ({ id: destino.endsWith('/feed') ? '1432682403259329_999' : '123' }))
  d.rpc.mockImplementation(async nombre => ({ error: null, data: nombre === 'begin_social_meta_publication'
    ? { id: reservaId, claim_id: claimId, claimed: true, status: 'preparing', post_url: null } : null }))
  d.subir.mockResolvedValue({ error: null })
  d.firmar.mockResolvedValue({ data: { signedUrl: 'https://almacen.test/imagen?firma=privada' }, error: null })
  d.eliminar.mockResolvedValue({ error: null })
  d.privado.mockReturnValue({ rpc: d.rpc, storage: { from: () => ({ upload: d.subir, createSignedUrl: d.firmar, remove: d.eliminar }) } })
})
describe('publicación privada Meta', () => {
  it('autoriza con MFA antes de consultar medios o proveedor', async () => {
    d.contexto.mockRejectedValueOnce(createError({ statusCode: 403 }))
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 403 })
    expect(d.contexto).toHaveBeenCalledWith({}, true)
    expect(d.verificar).not.toHaveBeenCalled()
  })
  it('rechaza origen cruzado antes de leer o enviar', async () => {
    d.origen.mockImplementationOnce(() => { throw createError({ statusCode: 403 }) })
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 403 })
    expect(d.consultar).not.toHaveBeenCalled()
  })
  it.each([{ confirmar: false }, { destino: 'x' }, { revision: 0 }, { versionArticulo: 1 }])('no envía una confirmación o versión inválida: %j', async cambio => {
    d.cuerpo.mockResolvedValueOnce({ confirmar: true, destino: 'facebook', revision: 1, versionArticulo: 2, ...cambio })
    await expect(ruta({} as H3Event)).rejects.toHaveProperty('statusCode')
    expect(d.consultar).not.toHaveBeenCalled()
  })
  it('no permite compartir borradores', async () => {
    d.contexto.mockResolvedValueOnce({ articulo: { ...articulo, estado: 'draft' } })
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 409 })
    expect(d.verificar).not.toHaveBeenCalled()
  })
  it('sube fotos sin publicar y confirma el feed después de persistir sending', async () => {
    await expect(ruta({} as H3Event)).resolves.toMatchObject({ estado: 'published', url: 'https://www.facebook.com/1432682403259329_999' })
    expect(d.consultar.mock.calls[0]![2]).toMatchObject({ parametros: { published: 'false' } })
    expect(d.rpc.mock.calls.map(llamada => llamada[1].p_status).filter(Boolean)).toEqual(['preparing', 'sending', 'published'])
    expect(d.subir).not.toHaveBeenCalled()
  })
  it.each(['published', 'sending', 'uncertain'])('no vuelve a enviar una reserva %s', async estado => {
    d.rpc.mockResolvedValueOnce({ data: { id: reservaId, claim_id: null, claimed: false, status: estado,
      post_url: estado === 'published' ? 'https://www.facebook.com/999' : null } })
    await ruta({} as H3Event)
    expect(d.consultar).not.toHaveBeenCalled()
  })
  it('nunca envía si falla la transición persistente a sending', async () => {
    d.rpc.mockImplementation(async nombre => nombre === 'begin_social_meta_publication'
      ? { data: { id: reservaId, claim_id: claimId, claimed: true, status: 'preparing', post_url: null } } : { error: { message: 'falló' } })
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 503 })
    expect(d.consultar.mock.calls.some(llamada => llamada[1].endsWith('/feed'))).toBe(false)
  })
  it('un error después de enviar queda incierto, nunca failed/reintento', async () => {
    d.consultar.mockImplementation(async (_token, destino) => { if (destino.endsWith('/feed')) throw new Error('red'); return { id: '123' } })
    await expect(ruta({} as H3Event)).resolves.toMatchObject({ estado: 'uncertain' })
    expect(d.rpc.mock.calls.at(-1)![1].p_status).toBe('uncertain')
  })
  it('conserva el éxito del proveedor aunque falle guardar el recibo', async () => {
    d.rpc.mockImplementation(async (nombre, parametros) => nombre === 'begin_social_meta_publication'
      ? { data: { id: reservaId, claim_id: claimId, claimed: true, status: 'preparing', post_url: null } }
      : { error: parametros.p_status === 'published' ? {} : null })
    await expect(ruta({} as H3Event)).resolves.toMatchObject({ estado: 'published', aviso: expect.any(String) })
  })
  it('Instagram usa JPEG privado firmado y procesa antes de publicar', async () => {
    d.cuerpo.mockResolvedValueOnce({ confirmar: true, destino: 'instagram', revision: 1, versionArticulo: 2 })
    d.verificar.mockResolvedValueOnce({ id: '17841472510522793', token: 'privado' })
    await expect(ruta({} as H3Event)).resolves.toMatchObject({ estado: 'published' })
    expect(d.subir).toHaveBeenCalledWith(expect.stringContaining(reservaId), expect.any(Buffer), { contentType: 'image/jpeg', upsert: false })
    expect(d.esperar).toHaveBeenCalledWith('privado', '123')
    expect(d.consultar.mock.calls.some(llamada => llamada[1].endsWith('/media_publish'))).toBe(true)
    expect(d.eliminar).toHaveBeenCalledTimes(1)
  })
  it('un fallo preparando Instagram no llama media_publish y limpia el archivo', async () => {
    d.cuerpo.mockResolvedValueOnce({ confirmar: true, destino: 'instagram', revision: 1, versionArticulo: 2 })
    d.esperar.mockRejectedValueOnce(createError({ statusCode: 409 }))
    await expect(ruta({} as H3Event)).rejects.toMatchObject({ statusCode: 409 })
    expect(d.consultar.mock.calls.some(llamada => llamada[1].endsWith('/media_publish'))).toBe(false)
    expect(d.rpc.mock.calls.at(-1)![1].p_status).toBe('failed')
    expect(d.eliminar).toHaveBeenCalledTimes(1)
  })
})
