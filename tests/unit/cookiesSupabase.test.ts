import { afterEach, expect, it, vi } from 'vitest'

const { guardarCookie, obtenerUsuario } = vi.hoisted(() => ({
  guardarCookie: vi.fn(),
  obtenerUsuario: vi.fn()
}))

vi.mock('h3', () => ({ setCookie: guardarCookie }))
vi.mock('@supabase/ssr', () => ({
  parseCookieHeader: () => [],
  createServerClient: (_url: string, _clave: string, opciones: {
    cookies: { setAll: (cookies: unknown[]) => void }
  }) => ({
    auth: {
      getUser: async () => {
        opciones.cookies.setAll([{ name: 'pont3la10-auth', value: 'sesion-renovada', options: { path: '/' } }])
        obtenerUsuario()
        return { data: { user: { id: 'usuario-prueba' } }, error: null }
      }
    }
  })
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('persiste la cookie al renovar la sesion SSR sin depender de autoimports de h3', async () => {
  const evento = { node: { req: { headers: {} } } }
  const estado = { value: null }
  vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: 'https://example.supabase.co', supabaseKey: 'clave-prueba' } }))
  vi.stubGlobal('useRequestEvent', () => evento)
  vi.stubGlobal('useState', () => estado)
  const { default: plugin } = await import('../../plugins/supabase.server')
  await (plugin as unknown as () => Promise<unknown>)()
  expect(guardarCookie).toHaveBeenCalledWith(evento, 'pont3la10-auth', 'sesion-renovada', expect.objectContaining({ path: '/', sameSite: 'lax' }))
  expect(obtenerUsuario).toHaveBeenCalledOnce()
  expect(estado.value).toEqual({ id: 'usuario-prueba' })
})
