import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sitioDeArticulo, urlBaseSocial, urlBaseSocialDeArticulo } from '../../server/utils/origenSocialPorSitio'

function clienteConSitio(site: unknown) {
  return {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: site === undefined ? null : { site } }) }) }) })
  } as unknown as SupabaseClient
}

describe('origen de las publicaciones en redes por sitio', () => {
  it('Colombia usa la dirección social configurada y México su propio dominio', () => {
    expect(urlBaseSocial('co', 'https://www.pont3la10.com').host).toBe('www.pont3la10.com')
    expect(urlBaseSocial('mx', 'https://www.pont3la10.com').host).toBe('mx.pont3la10.com')
    expect(new URL('/articulos/x', urlBaseSocial('mx', 'https://www.pont3la10.com')).toString()).toBe('https://mx.pont3la10.com/articulos/x')
  })

  it('lee el sitio del artículo y ante cualquier duda usa Colombia', async () => {
    expect(await sitioDeArticulo(clienteConSitio('mx'), 'a')).toBe('mx')
    expect(await sitioDeArticulo(clienteConSitio('co'), 'a')).toBe('co')
    expect(await sitioDeArticulo(clienteConSitio('zz'), 'a')).toBe('co')
    expect(await sitioDeArticulo(clienteConSitio(undefined), 'a')).toBe('co')
    expect((await urlBaseSocialDeArticulo(clienteConSitio('mx'), 'a', 'https://www.pont3la10.com')).host).toBe('mx.pont3la10.com')
  })

  it('si la lectura del sitio falla, no frena el envío y usa Colombia', async () => {
    const roto = { from: () => { throw new Error('sin conexión') } } as unknown as SupabaseClient
    expect(await sitioDeArticulo(roto, 'a')).toBe('co')
  })
})
