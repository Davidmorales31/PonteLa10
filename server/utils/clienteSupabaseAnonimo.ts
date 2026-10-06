import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/** Cliente público sin cookies editoriales ni privilegios de service_role. */
export function obtenerClienteSupabaseAnonimo(evento: H3Event): SupabaseClient {
  const config = useRuntimeConfig(evento)
  const supabaseUrl = String(config.public.supabaseUrl || '')
  const supabaseKey = String(config.public.supabaseKey || '')

  if (!supabaseUrl || !supabaseKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'La consulta pública de fútbol no está configurada.'
    })
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
