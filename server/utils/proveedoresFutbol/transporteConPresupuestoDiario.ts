import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import { ErrorProveedorFutbol } from './errores'

export type ReservaPeticionProveedorFutbol = (
  provider: IdentificadorProveedorFutbol,
  fechaNegocio: string,
  fechaListadoDiario: string | null
) => Promise<boolean>

/** Envuelve el transporte HTTP para reservar cuota en Supabase antes de cada fetch real. */
export function crearTransporteConPresupuestoDiario(
  provider: IdentificadorProveedorFutbol,
  fechaNegocio: string,
  reservar: ReservaPeticionProveedorFutbol,
  transporte: (url: string, init: RequestInit) => Promise<Response> = (url, init) => fetch(url, init)
): (url: string, init: RequestInit) => Promise<Response> {
  const fechasListadoReservadas = new Set<string>()
  return async (url, init) => {
    let fechaListadoDiario: string | null
    try {
      fechaListadoDiario = fechaDeListadoDiario(provider, new URL(url))
    } catch {
      throw errorSinPeticion()
    }

    // Una liga por solicitud en GOAL API: se reclama una sola vez el lease
    // diario de cada fecha; las demás ligas siguen reservando cuota sin lease.
    if (fechaListadoDiario && fechasListadoReservadas.has(fechaListadoDiario)) {
      fechaListadoDiario = null
    }

    // Si no se puede confirmar la reserva atómica, nunca se arriesga una llamada sin tope.
    const permitido = await reservar(provider, fechaNegocio, fechaListadoDiario).catch(() => false)
    if (!permitido) throw errorSinPeticion()

    const fechaReservadaAhora = fechaListadoDiario
    if (fechaReservadaAhora) fechasListadoReservadas.add(fechaReservadaAhora)

    return transporte(url, init)
  }
}

function fechaDeListadoDiario(provider: IdentificadorProveedorFutbol, url: URL): string | null {
  if (provider === 'api-football') {
    const fecha = url.searchParams.get('date')
    return url.pathname.endsWith('/fixtures') && fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      && !url.searchParams.has('id') && !url.searchParams.has('ids') ? fecha : null
  }
  const fecha = /\/fixtures\/date\/(\d{4}-\d{2}-\d{2})\/?$/.exec(url.pathname)?.[1]
  return fecha || null
}

function errorSinPeticion(): ErrorProveedorFutbol & { solicitudesConsumidas: number } {
  return Object.assign(new ErrorProveedorFutbol('LIMITE_CUOTA'), { solicitudesConsumidas: 0 })
}
