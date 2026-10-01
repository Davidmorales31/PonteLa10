import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import { crearProveedorApiFootball } from './apiFootball'
import { crearProveedorGoalApi } from './goalApi'
import type { ProveedorFutbol } from './contrato'

export interface ConfiguracionProveedoresFutbol {
  footballPrimaryProvider?: unknown
  footballFallbackProvider?: unknown
  goalApiKey?: unknown
  goalApiBaseUrl?: unknown
  apiSportsKey?: unknown
  apiSportsBaseUrl?: unknown
}

export interface ProveedoresFutbolConfigurados {
  principal: ProveedorFutbol
  secundario?: ProveedorFutbol
}

/**
 * Construye proveedores exclusivamente desde configuración privada de Nitro.
 * No realiza peticiones de red; las claves permanecen cerradas en cada adapter.
 */
export function crearProveedoresFutbolConfigurados(
  configuracion: ConfiguracionProveedoresFutbol
): ProveedoresFutbolConfigurados {
  const principalId = leerIdProveedor(configuracion.footballPrimaryProvider, 'api-football')
  const secundarioId = configuracion.footballFallbackProvider === ''
    ? undefined
    : leerIdProveedor(configuracion.footballFallbackProvider, 'goal-api')

  if (secundarioId && principalId === secundarioId) {
    throw new Error('El proveedor de fallback debe ser distinto del principal.')
  }

  const principal = crearProveedor(principalId, configuracion)
  const secundario = secundarioId ? crearProveedor(secundarioId, configuracion) : undefined
  return { principal, ...(secundario ? { secundario } : {}) }
}

function leerIdProveedor(
  valor: unknown,
  predeterminado?: IdentificadorProveedorFutbol
): IdentificadorProveedorFutbol {
  if (valor === undefined || valor === null || valor === '') {
    if (predeterminado) return predeterminado
    throw new Error('El proveedor de fútbol configurado no es válido.')
  }

  if (valor === 'goal-api' || valor === 'api-football') return valor
  throw new Error('El proveedor de fútbol configurado no es compatible.')
}

function crearProveedor(
  id: IdentificadorProveedorFutbol,
  configuracion: ConfiguracionProveedoresFutbol
): ProveedorFutbol {
  if (id === 'goal-api') {
    const apiKey = leerClave(configuracion.goalApiKey, 'Goal API')
    const baseUrl = leerBaseUrl(configuracion.goalApiBaseUrl)
    return crearProveedorGoalApi({ apiKey, baseUrl })
  }

  const apiKey = leerClave(configuracion.apiSportsKey, 'API-Football')
  const baseUrl = leerBaseUrl(configuracion.apiSportsBaseUrl)
  return crearProveedorApiFootball({ apiKey, baseUrl })
}

function leerClave(valor: unknown, nombre: string): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error(`La clave privada de ${nombre} no está configurada.`)
  }
  return valor.trim()
}

function leerBaseUrl(valor: unknown): string | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined
  if (typeof valor !== 'string') throw new Error('La URL base del proveedor no es válida.')

  let url: URL
  try {
    url = new URL(valor)
  } catch {
    throw new Error('La URL base del proveedor no es válida.')
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('La URL base del proveedor debe ser HTTPS y no contener credenciales ni parámetros.')
  }
  return url.toString().replace(/\/$/, '')
}
