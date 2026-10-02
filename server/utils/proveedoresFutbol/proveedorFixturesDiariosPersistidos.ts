import type { IdentificadorProveedorFutbol, PartidoFutbolProveedor } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from './contrato'
import { filtrarFixturesPrioritariosDelDia } from './prioridadFixturesDiarios'

export interface RepositorioCalendarioFutbol {
  cargarFixturesDiarios?(provider: IdentificadorProveedorFutbol, fechaNegocio: string): Promise<PartidoFutbolProveedor[] | null>
}

/** Lee el listado desde Supabase tras la carga inicial; evita repetir la consulta diaria. */
export function crearProveedorFixturesDiariosPersistidos(
  proveedor: ProveedorFutbol,
  repositorio: RepositorioCalendarioFutbol,
  fechaNegocio: string
): ProveedorFutbol {
  const consultarListaProveedor = proveedor.obtenerPartidosPorFecha.bind(proveedor)
  let solicitoListaDiaria = false
  let fechasListadoDiario: string[] = []

  return {
    ...proveedor,
    permiteDescubrimientoFixturesDiarios: true,
    seConsultoListadoDiario: () => solicitoListaDiaria,
    fechasListadoDiario: () => fechasListadoDiario,
    async obtenerPartidosPorFecha(consulta) {
      const persistidos = await repositorio.cargarFixturesDiarios?.(proveedor.id, fechaNegocio)
      if (persistidos !== null && persistidos !== undefined) {
        return { elementos: persistidos, consultadoEn: new Date().toISOString(), solicitudes: 0 }
      }

      solicitoListaDiaria = true
      let respuesta
      if (proveedor.id === 'goal-api') {
        const mananaUtc = siguienteDia(consulta.fecha)
        const [hoyUtc, manana] = await Promise.all([
          consultarListaProveedor({ ...consulta, fecha: consulta.fecha }),
          consultarListaProveedor({ ...consulta, fecha: mananaUtc })
        ])
        const porId = new Map([...hoyUtc.elementos, ...manana.elementos]
          .map(partido => [partido.idProveedor, partido] as const))
        respuesta = {
          elementos: [...porId.values()],
          consultadoEn: [hoyUtc.consultadoEn, manana.consultadoEn].sort().at(-1) || new Date().toISOString(),
          solicitudes: (hoyUtc.solicitudes ?? 1) + (manana.solicitudes ?? 1),
          cuota: cuotaMasConservadora(hoyUtc.cuota, manana.cuota)
        }
        fechasListadoDiario = [consulta.fecha, mananaUtc]
      } else {
        respuesta = await consultarListaProveedor(consulta)
        fechasListadoDiario = [consulta.fecha]
      }
      return {
        ...respuesta,
        elementos: filtrarFixturesPrioritariosDelDia(respuesta.elementos, fechaNegocio),
        solicitudes: respuesta.solicitudes ?? 1
      }
    }
  }
}

function siguienteDia(fecha: string): string {
  const inicio = Date.parse(`${fecha}T00:00:00Z`)
  if (!Number.isFinite(inicio)) throw new Error('La fecha diaria del proveedor no es válida.')
  return new Date(inicio + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function cuotaMasConservadora(
  primera: import('~/types/futbolProveedor').CuotaProveedorFutbol | undefined,
  segunda: import('~/types/futbolProveedor').CuotaProveedorFutbol | undefined
): import('~/types/futbolProveedor').CuotaProveedorFutbol | undefined {
  if (!primera) return segunda
  if (!segunda) return primera
  const limites = [primera.limite, segunda.limite].filter((valor): valor is number => typeof valor === 'number')
  const restantes = [primera.restante, segunda.restante].filter((valor): valor is number => typeof valor === 'number')
  return {
    ...(limites.length ? { limite: Math.min(...limites) } : {}),
    ...(restantes.length ? { restante: Math.min(...restantes) } : {})
  }
}
