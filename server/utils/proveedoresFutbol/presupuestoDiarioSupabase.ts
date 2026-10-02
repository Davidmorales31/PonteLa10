import type { SupabaseClient } from '@supabase/supabase-js'
import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'

/** Llama a la RPC atómica; cualquier error se convierte en denegación cerrada. */
export function crearReservaDiariaSupabaseFutbol(cliente: SupabaseClient) {
  return async (
    provider: IdentificadorProveedorFutbol,
    fechaNegocio: string,
    fechaListadoDiario: string | null
  ): Promise<boolean> => {
    const { data, error } = await cliente.rpc('reserve_football_provider_request', {
      p_provider: provider,
      p_business_date: fechaNegocio,
      p_fixture_list_date: fechaListadoDiario
    })
    return !error && data === true
  }
}
