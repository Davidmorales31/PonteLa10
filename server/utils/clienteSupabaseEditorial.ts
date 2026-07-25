import {
  createServerClient,
  parseCookieHeader,
  type CookieOptions
} from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

interface ContextoServidorConSupabase {
  clienteSupabaseEditorial?: SupabaseClient
}

export function obtenerClienteSupabaseEditorial(evento: H3Event): SupabaseClient {
  const contexto = evento.context as ContextoServidorConSupabase
  const eventoNuxt = evento as unknown as Parameters<typeof setCookie>[0]

  if (contexto.clienteSupabaseEditorial) {
    return contexto.clienteSupabaseEditorial
  }

  const config = useRuntimeConfig(evento)
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const supabaseKey = String(config.public.supabaseKey || '')

  if (!supabaseUrl || !supabaseKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'La autenticación no está configurada.'
    })
  }

  contexto.clienteSupabaseEditorial = createServerClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce'
    },
    cookies: {
      getAll: () => parseCookieHeader(eventoNuxt.node?.req.headers.cookie || '')
        .flatMap(cookie => cookie.value === undefined
          ? []
          : [{ name: cookie.name, value: cookie.value }]),
      setAll: (cookies: { name: string, value: string, options: CookieOptions }[]) =>
        cookies.forEach(({ name, value, options }) => {
        setCookie(eventoNuxt, name, value, {
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

  return contexto.clienteSupabaseEditorial
}
