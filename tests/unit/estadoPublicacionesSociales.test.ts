import { describe, expect, it } from 'vitest'
import { resumirRecibosSociales, leerEstadosPublicacionesSociales } from '~/server/utils/estadoPublicacionesSociales'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('historial persistente de envíos sociales', () => {
  it('conserva el éxito de una noticia aunque haya otros intentos o cambios posteriores', () => {
    const filas = [
      { article_id: 'noticia', destination: 'facebook' as const, status: 'published', post_url: 'https://www.facebook.com/123' },
      { article_id: 'noticia', destination: 'facebook' as const, status: 'failed', post_url: null },
      { article_id: 'noticia', destination: 'instagram' as const, status: 'failed', post_url: null }
    ]
    expect(resumirRecibosSociales(filas).noticia).toEqual({
      facebook: { estado: 'published', yaPublicado: true, url: 'https://www.facebook.com/123' }, instagram: { estado: 'failed' }
    })
  })
  it('un incierto o envío activo de otra huella sigue bloqueando la red al reabrir', () => {
    expect(resumirRecibosSociales([
      { article_id: 'noticia', destination: 'x', status: 'sending', post_url: null },
      { article_id: 'noticia', destination: 'instagram', status: 'uncertain', post_url: null },
      { article_id: 'noticia', destination: 'instagram', status: 'failed', post_url: null }
    ]).noticia).toEqual({ x: { estado: 'in_progress' }, instagram: { estado: 'uncertain' } })
  })
  it('falla cerrado si no puede comprobar los recibos', async () => {
    const privado = { from: () => ({ select: () => ({ in: async () => ({ error: { code: '503' } }) }) }) } as unknown as SupabaseClient
    await expect(leerEstadosPublicacionesSociales(privado, ['noticia'])).rejects.toMatchObject({ statusCode: 503 })
  })
})

describe('bandeja social de pendientes', () => {
  it('solo excluye noticias publicadas en Facebook e Instagram', async () => {
    const { articulosPublicadosEnAmbasRedes } = await import('~/server/utils/estadoPublicacionesSociales')
    const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222'
    expect(articulosPublicadosEnAmbasRedes([
      { article_id: a, destination: 'facebook', status: 'published' },
      { article_id: a, destination: 'instagram', status: 'published' },
      { article_id: b, destination: 'facebook', status: 'published' },
      { article_id: b, destination: 'instagram', status: 'failed' },
      { article_id: 'no-es-uuid) or 1=1', destination: 'facebook', status: 'published' }
    ])).toEqual([a])
  })
})
