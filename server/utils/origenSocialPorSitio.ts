import type { SupabaseClient } from '@supabase/supabase-js'
import { configuracionSitios, normalizarIdSitio, type IdSitio } from '~/utils/sitio'

/**
 * Dirección con la que se promociona un artículo en redes. Colombia usa la dirección social
 * configurada (así los entornos locales no se promocionan); México usa su propio dominio.
 */
export function urlBaseSocial(sitio: IdSitio, socialSiteUrl: string): URL {
  return new URL(sitio === 'mx' ? configuracionSitios.mx.origen : socialSiteUrl)
}

/** Sitio al que pertenece un artículo; ante cualquier duda, Colombia (el comportamiento de siempre). */
export async function sitioDeArticulo(cliente: SupabaseClient, articuloId: string): Promise<IdSitio> {
  try {
    const { data } = await cliente.from('articles').select('site').eq('id', articuloId).maybeSingle()
    return normalizarIdSitio((data as { site?: unknown } | null)?.site)
  } catch {
    // Si no se puede leer el sitio, se promociona como siempre (Colombia) en lugar de frenar el envío.
    return 'co'
  }
}

export async function urlBaseSocialDeArticulo(cliente: SupabaseClient, articuloId: string, socialSiteUrl: string): Promise<URL> {
  return urlBaseSocial(await sitioDeArticulo(cliente, articuloId), socialSiteUrl)
}
