import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/** Cliente privilegiado exclusivo de Nitro; la clave nunca se serializa al navegador. */
export function obtenerClienteSupabasePrivado(evento: H3Event): SupabaseClient | null {
  const configuracion = useRuntimeConfig(evento)
  const url = String(configuracion.public.supabaseUrl || '')
  const clavePrivilegiada = String(configuracion.supabaseServiceRoleKey || '')
  if (!url || !clavePrivilegiada) return null

  try {
    return createClient(url, clavePrivilegiada, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      },
      global: { fetch: fetchConTiempoLimite }
    })
  } catch {
    return null
  }
}

function fetchConTiempoLimite(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const limite = AbortSignal.timeout(3_000)
  const signal = init?.signal ? AbortSignal.any([init.signal, limite]) : limite
  return fetch(input, { ...init, signal })
}
