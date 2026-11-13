import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { procesarColaSocial } from '~/server/utils/procesarColaSocial'
import { crearDocumentoSocialPredeterminado } from '~/utils/editorial/publicacionesSociales'
const d = vi.hoisted(() => ({ articulo: vi.fn(), borrador: vi.fn(), publicar: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('~/server/utils/repositorioContenidoEditorial', () => ({ obtenerArticuloEditorial: d.articulo }))
vi.mock('~/server/utils/repositorioPublicacionesSociales', () => ({ leerBorradorSocial: d.borrador }))
vi.mock('~/server/utils/ejecutarPublicacionMeta', () => ({ ejecutarPublicacionMeta: d.publicar }))
const id = '11111111-1111-4111-8111-111111111111'
const documento = { textos: { facebook: 'Texto' } }
const trabajo = { id,claim_id: id,actor_id: id,article_id: id,revision: 1,article_version: 2,
  document_hash: createHash('sha256').update(JSON.stringify(documento)).digest('hex'),image_hash: 'a'.repeat(64),destinations: ['facebook','instagram'] }
const cliente = { rpc: d.rpc,from: d.from } as unknown as SupabaseClient
beforeEach(() => {
  vi.resetAllMocks()
  d.rpc.mockImplementation(async nombre => ({ data: nombre.startsWith('claim_') ? trabajo : null,error: null }))
  d.from.mockImplementation(nombre => {
    const consulta = { select: vi.fn().mockReturnThis(),eq: vi.fn().mockReturnThis(),in: vi.fn().mockReturnThis(),
      then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ data: nombre === 'user_roles' ? [{ role: 'propietario' }] : [{ permission: 'panel.acceder' },{ permission: 'contenido.editarTodos' }],error: null }).then(resolver) }
    return consulta
  })
  d.articulo.mockResolvedValue({ id,slug: 'noticia',versionBloqueo: 2 })
  d.borrador.mockResolvedValue({ borrador: { revision: 1,documento } })
  d.publicar.mockResolvedValue({ estado: 'published',url: 'https://www.facebook.com/123' })
})
describe('ejecutor de trabajos sociales aprobados', () => {
  it('no publica si no hay trabajo o la reserva es ilegible', async () => {
    d.rpc.mockResolvedValueOnce({ data: null })
    await procesarColaSocial(cliente, {}, 'https://www.pont3la10.com')
    expect(d.publicar).not.toHaveBeenCalled()
  })
  it('vuelve a comprobar permisos y no publica tras revocación', async () => {
    d.from.mockReturnValue({ select: vi.fn().mockReturnThis(),eq: vi.fn().mockReturnThis(),then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ data: [] }).then(resolver) })
    await procesarColaSocial(cliente, {}, 'https://www.pont3la10.com')
    expect(d.publicar).not.toHaveBeenCalled()
    expect(d.rpc.mock.calls.at(-1)![1].p_status).toBe('failed')
  })
  it('rechaza cambios posteriores a la aprobación', async () => {
    d.borrador.mockResolvedValueOnce({ borrador: { revision: 2,documento } })
    await procesarColaSocial(cliente, {}, 'https://www.pont3la10.com')
    expect(d.publicar).not.toHaveBeenCalled()
  })
  it('ejecuta ambos destinos con huella aprobada y registra éxito', async () => {
    await procesarColaSocial(cliente, {}, 'https://www.pont3la10.com')
    expect(d.publicar).toHaveBeenCalledTimes(2)
    expect(d.publicar.mock.calls[0]![4]).toBe(trabajo.image_hash)
    expect(d.rpc.mock.calls.at(-1)![1]).toMatchObject({ p_id: id,p_claim_id: id,p_status: 'published' })
  })
  it('ejecuta noticias pendientes sin borrador usando la misma composición predeterminada aprobada', async () => {
    const predeterminado = crearDocumentoSocialPredeterminado('Noticia pendiente', id, 'Contexto', 'https://www.pont3la10.com/articulos/noticia', id)
    d.rpc.mockResolvedValueOnce({ data: { ...trabajo, revision: 0,
      document_hash: createHash('sha256').update(JSON.stringify(predeterminado)).digest('hex') } })
    d.articulo.mockResolvedValueOnce({ id, slug: 'noticia', titulo: 'Noticia pendiente', portadaId: id, seo: { textoSocial: 'Contexto' }, resumen: 'Contexto', versionBloqueo: 2 })
    d.borrador.mockResolvedValueOnce({ borrador: null })
    await procesarColaSocial(cliente, {}, 'https://www.pont3la10.com')
    expect(d.publicar).toHaveBeenCalledTimes(2)
    expect(d.rpc.mock.calls.at(-1)![1].p_status).toBe('published')
  })
  it('distingue resultado parcial e incierto sin repetir las otras redes', async () => {
    d.publicar.mockResolvedValueOnce({ estado: 'published' }).mockResolvedValueOnce({ estado: 'uncertain' })
    await procesarColaSocial(cliente, {}, 'https://www.pont3la10.com')
    expect(d.rpc.mock.calls.at(-1)![1].p_status).toBe('uncertain')
    expect(d.publicar).toHaveBeenCalledTimes(2)
  })
})
