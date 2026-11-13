import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError, type H3Event } from 'h3'
import { cifrarOAuthX, permisosOAuthX } from '~/server/utils/oauthX'

const dobles = vi.hoisted(() => ({ contexto: vi.fn(), clientePrivado: vi.fn(), rpc: vi.fn(), from: vi.fn(),
  readBody: vi.fn(), renderizar: vi.fn(), leerBorrador: vi.fn(), validarMedios: vi.fn(), subir: vi.fn(), publicar: vi.fn() }))
vi.mock('~/server/utils/contextoPublicacionSocial', () => ({ contextoPublicacionSocial: dobles.contexto }))
vi.mock('~/server/utils/contextoOAuthSocial', () => ({ clienteOAuthSocial: dobles.clientePrivado }))
vi.mock('~/server/utils/renderizadorPublicacionSocial', () => ({ renderizarDiapositivaSocial: dobles.renderizar }))
vi.mock('~/server/utils/repositorioPublicacionesSociales', () => ({ leerBorradorSocial: dobles.leerBorrador,
  validarMediosSociales: dobles.validarMedios }))
vi.mock('~/server/utils/oauthX', async importOriginal => {
  const original = await importOriginal<typeof import('~/server/utils/oauthX')>()
  return { ...original, subirImagenX: dobles.subir, crearPublicacionX: dobles.publicar }
})

const articuloId = '33333333-3333-4333-8333-333333333333'
const actorId = '11111111-1111-4111-8111-111111111111'
const publicacionId = '44444444-4444-4444-8444-444444444444'
const clave = 'ab'.repeat(32)
const configuracion = { xClientId: 'cliente', xClientSecret: 'secreto', socialEncryptionKey: clave,
  xRedirectUri: 'http://localhost:3001/api/admin/redes/oauth/x/callback' }
const documento = { version: 1, tipo: 'unica', formato: 'cuadrado', red: 'x', variante: 'original',
  textos: { facebook: '', instagram: '', x: 'Una noticia para revisar. https://www.pont3la10.com/', whatsapp: '' },
  diapositivas: [{ id: '55555555-5555-4555-8555-555555555555', tipo: 'cta', medioId: null, titular: 'Una noticia',
    varianteCta: 'promocional', encuadres: Object.fromEntries(['cuadrado', 'vertical', 'historia', 'web', 'miniatura']
      .map(formato => [formato, { x: 0, y: 0, zoom: 1, degradado: 90, tamanoTexto: 60 }])) }], propuestas: [] }
const evento = {} as H3Event
let publicarX: (evento: H3Event) => Promise<unknown>
const actor = { usuario: { id: actorId } }
const articuloPublicado = { id: articuloId, estado: 'published', tieneVersionPublica: true,
  titulo: 'Una noticia', portadaId: null, seo: { textoSocial: 'Una noticia' }, resumen: 'Resumen' }

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('readBody', dobles.readBody)
  vi.stubGlobal('useRuntimeConfig', () => configuracion)
  publicarX = (await import('~/server/api/admin/redes/[id]/publicar-x.post')).default as unknown as typeof publicarX
})
beforeEach(() => {
  vi.clearAllMocks()
  dobles.contexto.mockResolvedValue({ cliente: {}, articulo: articuloPublicado, urlCanonica: 'https://www.pont3la10.com/articulos/una-noticia',
    dominio: 'www.pont3la10.com', contexto: actor })
  dobles.readBody.mockResolvedValue({ confirmar: true })
  dobles.leerBorrador.mockResolvedValue({ disponible: true, borrador: { documento } })
  dobles.validarMedios.mockResolvedValue([])
  dobles.renderizar.mockResolvedValue({ bytes: Buffer.from('imagen'), tipoMime: 'image/png' })
  dobles.subir.mockResolvedValue('123456')
  dobles.publicar.mockResolvedValue('987654321')
  dobles.rpc.mockImplementation(async nombre => nombre === 'begin_social_x_publication'
    ? { data: { id: publicacionId, status: 'reserved', claimed: true, post_id: null, post_url: null }, error: null }
    : { data: null, error: null })
  dobles.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: publicacionId, username: 'Pont3la10',
      token_cipher: cifrarOAuthX({ access_token: 'token-falso', refresh_token: 'refresh-falso', token_type: 'bearer',
        expires_in: 7200, scope: permisosOAuthX.join(' ') }, clave, 'x:tokens:Pont3la10'), scopes: [...permisosOAuthX],
      expires_at: new Date(Date.now() + 3_600_000).toISOString() }, error: null }) })
  dobles.clientePrivado.mockReturnValue({ rpc: dobles.rpc, from: dobles.from })
})
afterAll(() => vi.unstubAllGlobals())

describe('ruta privada de publicación en X', () => {
  it('exige permiso/MFA antes de leer o reservar contenido', async () => {
    dobles.contexto.mockRejectedValueOnce(Object.assign(new Error('MFA requerido'), { statusCode: 403 }))
    await expect(publicarX(evento)).rejects.toMatchObject({ statusCode: 403 })
    expect(dobles.contexto).toHaveBeenCalledWith(evento, true)
    expect(dobles.clientePrivado).not.toHaveBeenCalled()
    expect(dobles.publicar).not.toHaveBeenCalled()
  })
  it('rechaza artículos que aún no están publicados y no contacta X', async () => {
    dobles.contexto.mockResolvedValueOnce({ cliente: {}, articulo: { ...articuloPublicado, estado: 'draft', tieneVersionPublica: false },
      urlCanonica: 'https://www.pont3la10.com/articulos/una-noticia', contexto: actor })
    await expect(publicarX(evento)).rejects.toMatchObject({ statusCode: 409 })
    expect(dobles.clientePrivado).not.toHaveBeenCalled()
    expect(dobles.publicar).not.toHaveBeenCalled()
  })
  it('requiere el gesto de confirmación explícito', async () => {
    dobles.readBody.mockResolvedValueOnce({ confirmar: false })
    await expect(publicarX(evento)).rejects.toMatchObject({ statusCode: 400 })
    expect(dobles.clientePrivado).not.toHaveBeenCalled()
  })
  it('usa el token cifrado, sube la composición y persiste el recibo sin duplicar', async () => {
    await expect(publicarX(evento)).resolves.toMatchObject({ estado: 'published', url: 'https://x.com/Pont3la10/status/987654321' })
    expect(dobles.subir).toHaveBeenCalledTimes(1)
    expect(dobles.publicar).toHaveBeenCalledWith('token-falso', documento.textos.x, ['123456'])
    expect(dobles.rpc.mock.calls.map(([nombre]) => nombre)).toEqual([
      'begin_social_x_publication', 'set_social_x_publication_status', 'set_social_x_publication_status', 'set_social_x_publication_status'
    ])
  })
})
