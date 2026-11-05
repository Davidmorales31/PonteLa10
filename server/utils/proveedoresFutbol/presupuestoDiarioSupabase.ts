import type { SupabaseClient } from '@supabase/supabase-js'
import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import { ErrorProveedorFutbol } from './errores'

/** Reserva cuota y conserva los bloqueos temporales como reintentos seguros. */
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
    if (error) throw errorTemporalReserva()
    if (data === true) return true

    if (fechaListadoDiario) {
      const { data: lista, error: errorLista } = await cliente
        .from('football_provider_fixture_lists')
        .select('claimed_at,loaded_at')
        .eq('provider', provider)
        .eq('business_date', fechaNegocio)
        .eq('fixture_date', fechaListadoDiario)
        .maybeSingle()
      if (errorLista) throw errorTemporalReserva()

      const reclamado = lista?.claimed_at ? Date.parse(lista.claimed_at) : Number.NaN
      if (lista && !lista.loaded_at && Number.isFinite(reclamado)
        && reclamado > Date.now() - 15 * 60_000) {
        throw errorTemporalReserva()
      }
    }

    return false
  }
}

function errorTemporalReserva(): ErrorProveedorFutbol & { code: string; solicitudesConsumidas: number } {
  return Object.assign(new ErrorProveedorFutbol('LIMITE_CUOTA'), {
    code: 'WORKER_WINDOW_BUSY',
    solicitudesConsumidas: 0
  })
}
