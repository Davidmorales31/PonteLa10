import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import type { H3Event } from 'h3'
import { contextoPublicacionSocial } from '~/server/utils/contextoPublicacionSocial'
const dobles = vi.hoisted(() => ({ permiso: vi.fn(), mfa: vi.fn(), articulo: vi.fn(), cliente: vi.fn() }))
vi.mock('~/server/utils/autorizacionEditorial', () => ({ exigirPermisoEditorial: dobles.permiso, exigirMfaSegunPoliticaEditorial: dobles.mfa }))
vi.mock('~/server/utils/clienteSupabaseEditorial', () => ({ obtenerClienteSupabaseEditorial: dobles.cliente }))
vi.mock('~/server/utils/repositorioContenidoEditorial', () => ({ obtenerArticuloEditorial: dobles.articulo }))
const evento = {} as H3Event
beforeEach(() => {
  vi.clearAllMocks()
  dobles.permiso.mockResolvedValue({ usuario: { id: 'editor' }, permisos: ['contenido.editarTodos'] })
  dobles.articulo.mockResolvedValue({ id: 'noticia', slug: 'noticia-real' })
  dobles.cliente.mockReturnValue({})
  vi.stubGlobal('getRouterParam', () => '11111111-1111-4111-8111-111111111111')
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://www.pont3la10.com' } }))
  vi.stubGlobal('setHeader', vi.fn())
  vi.stubGlobal('getHeader', (_evento: H3Event, nombre: string) => nombre === 'origin' ? 'https://www.pont3la10.com' : 'application/json')
  vi.stubGlobal('getRequestURL', () => new URL('https://www.pont3la10.com/api/admin/redes/id'))
  vi.stubGlobal('createError', (opciones: object) => Object.assign(new Error(), opciones))
})
afterEach(() => vi.unstubAllGlobals())
describe('acceso al módulo social', () => {
  it('exige lectura editorial antes de consultar el artículo', async () => {
    const resultado = await contextoPublicacionSocial(evento)
    expect(dobles.permiso).toHaveBeenCalledWith(evento, 'contenido.verBorradores')
    expect(resultado.urlCanonica).toBe('https://www.pont3la10.com/articulos/noticia-real')
  })
  it('usa el dominio público social aunque el panel funcione en localhost', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'http://localhost:3333', socialSiteUrl: 'https://www.pont3la10.com' } }))
    const resultado = await contextoPublicacionSocial(evento)
    expect(resultado.dominio).toBe('www.pont3la10.com')
    expect(resultado.urlCanonica).not.toContain('localhost')
  })
  it('no consulta contenido cuando falla la sesión o el permiso', async () => {
    dobles.permiso.mockRejectedValueOnce(Object.assign(new Error(), { statusCode: 401 }))
    await expect(contextoPublicacionSocial(evento)).rejects.toMatchObject({ statusCode: 401 })
    expect(dobles.articulo).not.toHaveBeenCalled()
  })
  it('exige edición y política MFA para escrituras y exportaciones', async () => {
    await contextoPublicacionSocial(evento, true)
    expect(dobles.permiso).toHaveBeenCalledWith(evento, 'contenido.editarTodos')
    expect(dobles.mfa).toHaveBeenCalledOnce()
  })
  it('rechaza origen cruzado sin leer el artículo', async () => {
    vi.stubGlobal('getHeader', (_evento: H3Event, nombre: string) => nombre === 'origin' ? 'https://ajeno.example' : 'application/json')
    await expect(contextoPublicacionSocial(evento, true)).rejects.toMatchObject({ statusCode: 403 })
    expect(dobles.articulo).not.toHaveBeenCalled()
  })
  it('rechaza formularios simples y UUID inválido', async () => {
    vi.stubGlobal('getHeader', () => 'text/plain')
    await expect(contextoPublicacionSocial(evento, true)).rejects.toMatchObject({ statusCode: 415 })
    vi.stubGlobal('getRouterParam', () => '../../secreto')
    await expect(contextoPublicacionSocial(evento)).rejects.toMatchObject({ statusCode: 422 })
  })
})
