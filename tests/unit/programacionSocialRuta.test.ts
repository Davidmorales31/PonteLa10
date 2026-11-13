import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError, type H3Event } from 'h3'
const d = vi.hoisted(() => ({ permiso: vi.fn(),mfa: vi.fn(),origen: vi.fn(),privado: vi.fn(),cliente: vi.fn(),articulo: vi.fn(),leer: vi.fn(),medios: vi.fn(),validar: vi.fn(),verificar: vi.fn(),renderizar: vi.fn(),rpc: vi.fn(),cuerpo: vi.fn(),latido: vi.fn() }))
vi.mock('~/server/utils/autorizacionEditorial', () => ({ exigirPermisoEditorial: d.permiso,exigirMfaSegunPoliticaEditorial: d.mfa }))
vi.mock('~/server/utils/contextoOAuthSocial', () => ({ validarOrigenOAuthSocial: d.origen,clienteOAuthSocial: d.privado }))
vi.mock('~/server/utils/clienteSupabaseEditorial', () => ({ obtenerClienteSupabaseEditorial: d.cliente }))
vi.mock('~/server/utils/repositorioContenidoEditorial', () => ({ obtenerArticuloEditorial: d.articulo }))
vi.mock('~/server/utils/repositorioPublicacionesSociales', () => ({ leerBorradorSocial: d.leer,validarMediosSociales: d.medios }))
vi.mock('~/server/utils/recursosComposicionSocial', () => ({ validarPublicacionSocialLista: d.validar }))
vi.mock('~/server/utils/publicacionMeta', () => ({ verificarCuentaMeta: d.verificar }))
vi.mock('~/server/utils/ejecutarPublicacionMeta', () => ({ renderizarImagenesMeta: d.renderizar,huellaImagenesMeta: () => 'b'.repeat(64) }))
const id='11111111-1111-4111-8111-111111111111'
const documento={ formato: 'cuadrado',textos: { facebook: 'Texto',instagram: 'Texto' },diapositivas: [] }
let ruta: (evento: H3Event) => Promise<unknown>
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler',(handler: unknown)=>handler)
  vi.stubGlobal('createError',createError); vi.stubGlobal('readBody',d.cuerpo); vi.stubGlobal('setHeader',vi.fn())
  vi.stubGlobal('useRuntimeConfig',()=>({ public: { socialSiteUrl: 'https://www.pont3la10.com' } }))
  ruta=(await import('~/server/api/admin/redes/programacion/cola.post')).default as unknown as typeof ruta
})
afterAll(()=>vi.unstubAllGlobals())
beforeEach(()=>{
  vi.resetAllMocks()
  d.permiso.mockResolvedValue({ usuario: { id } })
  d.cuerpo.mockResolvedValue({ operacionId: id,confirmar: true,articulos: [id],destinos: ['facebook','instagram'],inicio: new Date(Date.now()+3600000).toISOString(),intervaloMinutos: 15 })
  d.latido.mockResolvedValue({ data: { last_seen_at: new Date().toISOString() } })
  d.rpc.mockResolvedValue({ data: id,error: null })
  d.privado.mockReturnValue({ rpc: d.rpc,from:()=>({ select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:d.latido }) })
  d.articulo.mockResolvedValue({ id,slug:'prueba',estado:'published',tieneVersionPublica:true,versionBloqueo:2 })
  d.leer.mockResolvedValue({ borrador: { revision: 1,documento } })
  d.medios.mockResolvedValue([]); d.renderizar.mockResolvedValue([Buffer.from('imagen')])
})
describe('aprobación humana del lote social',()=>{
  it('exige permiso, MFA y origen antes de reservar',async()=>{
    d.mfa.mockImplementationOnce(()=>{throw createError({statusCode:403})})
    await expect(ruta({} as H3Event)).rejects.toMatchObject({statusCode:403})
    expect(d.rpc).not.toHaveBeenCalled()
  })
  it('rechaza ausencia de confirmación',async()=>{
    d.cuerpo.mockResolvedValueOnce({confirmar:false})
    await expect(ruta({} as H3Event)).rejects.toMatchObject({statusCode:400})
    expect(d.rpc).not.toHaveBeenCalled()
  })
  it('no guarda una cola que no tiene ejecutor activo',async()=>{
    d.latido.mockResolvedValueOnce({data:null})
    await expect(ruta({} as H3Event)).rejects.toMatchObject({statusCode:503})
    expect(d.rpc).not.toHaveBeenCalled()
  })
  it('no admite artículos sin publicar',async()=>{
    d.articulo.mockResolvedValueOnce({estado:'draft'})
    await expect(ruta({} as H3Event)).rejects.toMatchObject({statusCode:409})
    expect(d.rpc).not.toHaveBeenCalled()
  })
  it('guarda una aprobación con revisiones y huellas sin publicar ni almacenar claves',async()=>{
    await expect(ruta({} as H3Event)).resolves.toMatchObject({loteId:id,cantidad:1})
    const argumentos=d.rpc.mock.calls[0]![1]
    expect(argumentos.p_items[0]).toMatchObject({id,revision:1,articleVersion:2,imageHash:'b'.repeat(64),hash:expect.stringMatching(/^[a-f0-9]{64}$/)})
    expect(d.rpc).toHaveBeenCalledTimes(1)
    expect(d.origen).toHaveBeenCalled()
  })
})
