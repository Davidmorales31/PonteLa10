import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UsuarioEditorial } from '~/types/autenticacion'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const supabaseKey = String(config.public.supabaseKey || '')

  const clienteSupabase = supabaseUrl && supabaseKey
    ? createBrowserClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          persistSession: true
        },
        cookieOptions: {
          name: 'pont3la10-auth',
          sameSite: 'lax',
          secure: import.meta.env.PROD
        },
        isSingleton: true
      })
    : null

  if (clienteSupabase) {
    const usuarioActual = useState<UsuarioEditorial | null>('auth:usuarioActual', () => null)

    clienteSupabase.auth.onAuthStateChange((_evento, sesion) => {
      usuarioActual.value = sesion?.user || null
    })
  }

  return {
    provide: {
      clienteSupabase: clienteSupabase as SupabaseClient | null
    }
  }
})
