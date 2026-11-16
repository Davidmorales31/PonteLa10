import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { z } from 'zod'
import type { ConfiguracionMeta } from './publicacionMeta'

const esquemaConfiguracion = z.object({
  metaAccessToken: z.string().min(20).max(8192).optional(),
  metaFacebookPageAccessToken: z.string().min(20).max(8192).optional(),
  metaFacebookPageId: z.literal('1432682403259329'),
  metaInstagramAccountId: z.literal('17841472510522793')
}).refine(config => Boolean(config.metaAccessToken || config.metaFacebookPageAccessToken))

/** Exclusivo del servidor: Vault nunca forma parte de una respuesta al navegador. */
export async function resolverConfiguracionMetaSocial<T extends ConfiguracionMeta>(cliente: SupabaseClient, configuracion: T): Promise<T> {
  if (esquemaConfiguracion.safeParse(configuracion).success) return configuracion
  const { data, error } = await cliente.rpc('get_social_meta_configuration')
  const lectura = esquemaConfiguracion.safeParse(data)
  if (error || !lectura.success) throw createError({ statusCode: 503, statusMessage: 'Falta configurar las cuentas de redes en el servidor.' })
  return { ...configuracion, ...lectura.data }
}

export function estadoProgramadorSocial(ultimoLatido?: string | null, ahora = Date.now()): boolean {
  const fecha = Date.parse(ultimoLatido || '')
  return Number.isFinite(fecha) && fecha <= ahora + 5_000 && fecha > ahora - 180_000
}
