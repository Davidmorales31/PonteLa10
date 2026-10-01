import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import { validarProveedorFutbol, type ProveedorFutbol } from './contrato'

export interface RegistroFallbackFutbol {
  operacion: string
  proveedor: IdentificadorProveedorFutbol
  resultado: 'exito' | 'error' | 'cuota'
  usoFallback: boolean
  solicitudes?: number
}

export interface OpcionesFallbackFutbol {
  principal: ProveedorFutbol
  secundario?: ProveedorFutbol
  /** Gate de cuota independiente por proveedor. Ausente significa que el caller ya controla el presupuesto. */
  puedeConsumir?: (proveedor: IdentificadorProveedorFutbol) => boolean | Promise<boolean>
  registrar?: (evento: RegistroFallbackFutbol) => void | Promise<void>
}

export interface ResultadoFallbackFutbol<T> {
  datos: T
  proveedor: IdentificadorProveedorFutbol
  usoFallback: boolean
}

/**
 * Crea una consulta de fallback bajo demanda: nunca consulta ambos proveedores
 * cuando el principal responde, aunque la colección devuelta esté vacía.
 * No reintenta ni hace fan-out; el presupuesto del proveedor secundario se
 * verifica independientemente antes de ejecutar la consulta.
 */
export function crearFallbackProveedorFutbol(opciones: OpcionesFallbackFutbol) {
  validarProveedorFutbol(opciones.principal)

  if (opciones.secundario) {
    validarProveedorFutbol(opciones.secundario)
    if (opciones.principal.id === opciones.secundario.id) {
      throw new Error('El proveedor secundario debe ser distinto del principal.')
    }
  }

  async function autorizado(proveedor: IdentificadorProveedorFutbol): Promise<boolean> {
    return opciones.puedeConsumir ? opciones.puedeConsumir(proveedor) : true
  }

  async function registrar(evento: RegistroFallbackFutbol): Promise<void> {
    await opciones.registrar?.(evento)
  }

  return {
    async consultar<T>(
      operacion: string,
      ejecutar: (proveedor: ProveedorFutbol) => Promise<T>
    ): Promise<ResultadoFallbackFutbol<T>> {
      if (!operacion.trim()) throw new Error('La operación de fútbol debe tener un nombre.')

      if (await autorizado(opciones.principal.id)) {
        try {
          const datos = await ejecutar(opciones.principal)
          await registrar({
            operacion,
            proveedor: opciones.principal.id,
            resultado: 'exito',
            usoFallback: false,
            solicitudes: leerSolicitudes(datos)
          })
          return { datos, proveedor: opciones.principal.id, usoFallback: false }
        } catch (error) {
          // Do not propagate provider response bodies, which can include sensitive data.
          await registrar({
            operacion,
            proveedor: opciones.principal.id,
            resultado: 'error',
            usoFallback: false,
            solicitudes: leerSolicitudesError(error)
          })
        }
      } else {
        await registrar({
          operacion,
          proveedor: opciones.principal.id,
          resultado: 'cuota',
          usoFallback: false
        })
      }

      if (!opciones.secundario) throw new Error('El proveedor principal falló y no hay fallback configurado.')

      if (!(await autorizado(opciones.secundario.id))) {
        await registrar({
          operacion,
          proveedor: opciones.secundario.id,
          resultado: 'cuota',
          usoFallback: true
        })
        throw new Error('El proveedor secundario no tiene cuota autorizada.')
      }

      try {
        const datos = await ejecutar(opciones.secundario)
        await registrar({
          operacion,
          proveedor: opciones.secundario.id,
          resultado: 'exito',
          usoFallback: true,
          solicitudes: leerSolicitudes(datos)
        })
        return { datos, proveedor: opciones.secundario.id, usoFallback: true }
      } catch (error) {
        await registrar({
          operacion,
          proveedor: opciones.secundario.id,
          resultado: 'error',
          usoFallback: true,
          solicitudes: leerSolicitudesError(error)
        })
        // No propagar el cuerpo de error del proveedor, que podría incluir datos sensibles.
        const solicitudes = leerSolicitudesError(error)
        const causaSegura = Object.assign(new Error('PROVIDER_FAILURE'), { solicitudesConsumidas: solicitudes })
        throw Object.assign(
          new Error('Fallaron el proveedor principal y el fallback de fútbol.', { cause: causaSegura }),
          { solicitudesConsumidas: solicitudes }
        )
      }
    }
  }
}

function leerSolicitudes(datos: unknown): number {
  if (datos && typeof datos === 'object') {
    const valor = (datos as { solicitudes?: unknown }).solicitudes
    if (Number.isInteger(valor) && typeof valor === 'number' && valor >= 0) return valor
  }
  return 1
}

function leerSolicitudesError(error: unknown): number {
  if (error && typeof error === 'object') {
    const valor = (error as { solicitudesConsumidas?: unknown }).solicitudesConsumidas
    if (Number.isInteger(valor) && typeof valor === 'number' && valor >= 0) return valor
  }
  return 1
}
