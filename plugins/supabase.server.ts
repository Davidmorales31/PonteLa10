import {
  createServerClient,
  parseCookieHeader,
  type CookieOptions
} from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UsuarioEditorial } from '~/types/autenticacion'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const supabaseKey = String(config.public.supabaseKey || '')
  const evento = useRequestEvent()

  if (!supabaseUrl || !supabaseKey || !evento) {
    return {
      provide: {
        clienteSupabase: null as SupabaseClient | null
      }
    }
  }

  const clienteSupabase = createServerClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce'
    },
    cookies: {
      getAll: () => parseCookieHeader(evento.node?.req.headers.cookie || '')
        .flatMap(cookie => cookie.value === undefined
          ? []
          : [{ name: cookie.name, value: cookie.value }]),
      setAll: (cookies: { name: string, value: string, options: CookieOptions }[]) =>
        cookies.forEach(({ name, value, options }) => {
        setCookie(evento, name, value, {
          ...options,
          sameSite: 'lax',
          secure: import.meta.env.PROD
        })
        })
    },
    cookieOptions: {
      name: 'pont3la10-auth',
      sameSite: 'lax',
      secure: import.meta.env.PROD
    }
  })

  const usuarioActual = useState<UsuarioEditorial | null>('auth:usuarioActual', () => null)

  try {
    const { data, error } = await clienteSupabase.auth.getUser()
    usuarioActual.value = error ? null : data.user
  } catch {
    usuarioActual.value = null
  }

  return {
    provide: {
      clienteSupabase: clienteSupabase as SupabaseClient
    }
  }
})
