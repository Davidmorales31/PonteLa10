import { afterEach, describe, expect, it, vi } from 'vitest'
import { consultarMeta, credencialMeta, esperarContenedorMeta, limpiarMediosMetaCaducados, verificarCuentaMeta } from '~/server/utils/publicacionMeta'
import type { SupabaseClient } from '@supabase/supabase-js'

afterEach(() => vi.unstubAllGlobals())
describe('transporte y cuentas Meta', () => {
  it('rechaza otra página aunque haya credencial', () => {
    expect(() => credencialMeta({ metaFacebookPageId: '123', metaFacebookPageAccessToken: 'falso' }, 'facebook')).toThrow()
  })
  it('no admite URLs del cliente y no sigue redirecciones', async () => {
    const transporte = vi.fn().mockResolvedValue(new Response('{"id":"123"}'))
    await expect(consultarMeta('privado', 'https://otro.test', {}, transporte)).rejects.toMatchObject({ statusCode: 500 })
    expect(transporte).not.toHaveBeenCalled()
    await consultarMeta('privado', '123/feed', { metodo: 'POST', parametros: { message: 'Texto' } }, transporte)
    expect(transporte.mock.calls[0]![0].origin).toBe('https://graph.facebook.com')
    expect(transporte.mock.calls[0]![1]).toMatchObject({ redirect: 'error', method: 'POST', headers: { Authorization: 'Bearer privado' } })
    expect(String(transporte.mock.calls[0]![0])).not.toContain('privado')
  })
  it('oculta errores y tokens del proveedor', async () => {
    const transporte = vi.fn().mockResolvedValue(new Response('{"error":{"message":"secreto-proveedor"}}', { status: 403 }))
    await expect(consultarMeta('privado', 'me', {}, transporte)).rejects.toMatchObject({ statusCode: 502 })
    try { await consultarMeta('privado', 'me', {}, transporte) } catch (problema) { expect(String(problema)).not.toContain('secreto-proveedor') }
  })
  it('rechaza una credencial que representa una cuenta diferente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"id":"123","name":"Otra"}')))
    await expect(verificarCuentaMeta({ metaFacebookPageId: '1432682403259329', metaFacebookPageAccessToken: 'falso' }, 'facebook'))
      .rejects.toMatchObject({ statusCode: 409 })
  })
  it('espera una sola vez y nunca publica al consultar el contenedor', async () => {
    const transporte = vi.fn().mockResolvedValueOnce(new Response('{"status_code":"IN_PROGRESS"}'))
      .mockResolvedValueOnce(new Response('{"status_code":"FINISHED"}'))
    vi.stubGlobal('fetch', transporte)
    const pausa = vi.fn().mockResolvedValue(undefined)
    await esperarContenedorMeta('falso', '123', pausa)
    expect(pausa).toHaveBeenCalledWith(60000)
    expect(transporte.mock.calls.every(llamada => llamada[1].method === 'GET')).toBe(true)
  })
  it('no permite publicar un contenedor rechazado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"status_code":"ERROR"}')))
    await expect(esperarContenedorMeta('falso', '123', vi.fn())).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('limpieza acotada de medios Meta', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const claim = '22222222-2222-4222-8222-222222222222'
  function clientePrueba(rutas: string[], fallaBorrado = false) {
    const actualizar = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), lt: vi.fn().mockResolvedValue({ error: null }) })
    const eliminar = vi.fn().mockResolvedValue({ error: fallaBorrado ? {} : null })
    const consulta = { select: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [{ id, claim_id: claim, media_paths: rutas, retired_media_paths: [] }] }), update: actualizar }
    return { actualizar, eliminar, cliente: { from: () => consulta, storage: { from: () => ({ remove: eliminar }) } } as unknown as SupabaseClient }
  }
  it('no borra rutas fuera del recibo', async () => {
    const prueba = clientePrueba(['directorio-ajeno/0.jpg'])
    await limpiarMediosMetaCaducados(prueba.cliente)
    expect(prueba.eliminar).not.toHaveBeenCalled()
  })
  it('conserva referencias si Storage rechaza eliminar', async () => {
    const prueba = clientePrueba([`${id}/${claim}/0.jpg`], true)
    await limpiarMediosMetaCaducados(prueba.cliente)
    expect(prueba.actualizar).not.toHaveBeenCalled()
  })
  it('limpia referencias únicamente después de eliminar los archivos', async () => {
    const prueba = clientePrueba([`${id}/${claim}/0.jpg`])
    await limpiarMediosMetaCaducados(prueba.cliente)
    expect(prueba.actualizar).toHaveBeenCalledWith({ media_paths: [], retired_media_paths: [] })
  })
})
