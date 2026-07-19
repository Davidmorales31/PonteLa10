import type { SupabaseClient } from '@supabase/supabase-js'

declare module '#app' {
  interface NuxtApp {
    $clienteSupabase?: SupabaseClient | null
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $clienteSupabase?: SupabaseClient | null
  }
}

export {}
