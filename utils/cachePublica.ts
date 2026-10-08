import { etiquetaEstadoSeoPartido } from './schemaPartidoSeo'

export type TipoCachePublica =
  | 'articulo'
  | 'equipo'
  | 'competicion'
  | 'partidoProgramado'
  | 'partidoEnVivo'
  | 'partidoPendiente'
  | 'partidoFinalizado'
  | 'tabla'
  | 'sitemap'

export interface PoliticaCachePublica {
  sMaxAge: number
  staleWhileRevalidate: number
}

export const CABECERA_VARIANTE_CACHE_PUBLICA = 'x-pont3la10-cache-variant'

export interface SolicitudCachePublica {
  cookie?: string
  authorization?: string
  setCookie?: boolean
}

const politicasCachePublicas: Record<TipoCachePublica, PoliticaCachePublica> = {
  articulo: { sMaxAge: 300, staleWhileRevalidate: 600 },
  equipo: { sMaxAge: 120, staleWhileRevalidate: 120 },
  competicion: { sMaxAge: 60, staleWhileRevalidate: 60 },
  partidoProgramado: { sMaxAge: 30, staleWhileRevalidate: 0 },
  partidoEnVivo: { sMaxAge: 15, staleWhileRevalidate: 0 },
  partidoPendiente: { sMaxAge: 10, staleWhileRevalidate: 0 },
  partidoFinalizado: { sMaxAge: 300, staleWhileRevalidate: 300 },
  tabla: { sMaxAge: 30, staleWhileRevalidate: 0 },
  sitemap: { sMaxAge: 300, staleWhileRevalidate: 300 }
}

export interface CabecerasCachePublica {
  cacheControl: string
  cdnCacheControl: string
}

export function obtenerCabecerasCachePublica(tipo: TipoCachePublica): CabecerasCachePublica {
  const politica = politicasCachePublicas[tipo]
  const stale = politica.staleWhileRevalidate
    ? ', stale-while-revalidate=' + politica.staleWhileRevalidate
    : ''

  return {
    cacheControl: 'public, max-age=0, must-revalidate',
    cdnCacheControl: 'public, s-maxage=' + politica.sMaxAge + stale
  }
}

export function obtenerTipoCachePartido(estado: string | null): TipoCachePublica {
  const estadoVisible = etiquetaEstadoSeoPartido(estado)
  if (estadoVisible === 'EN VIVO') return 'partidoEnVivo'
  if (estadoVisible === 'ACTUALIZACIÓN PENDIENTE') return 'partidoPendiente'
  if (['FINALIZADO', 'CANCELADO', 'ABANDONADO'].includes(estadoVisible)) {
    return 'partidoFinalizado'
  }
  return 'partidoProgramado'
}

export function obtenerVarianteCachePublica(
  entrada: Pick<SolicitudCachePublica, 'cookie' | 'authorization'>
): 'publica' | 'privada' {
  if (entrada.authorization?.trim() || tieneCookieSesionEditorial(entrada.cookie)) return 'privada'
  return 'publica'
}

export function solicitudPuedeUsarCachePublica(entrada: SolicitudCachePublica): boolean {
  if (entrada.setCookie) return false
  return obtenerVarianteCachePublica(entrada) === 'publica'
}

export function combinarVary(
  varyExistente: string | undefined,
  agregar: string[],
  excluir: string[] = []
): string {
  const valores = new Map<string, string>()
  const valoresExcluidos = new Set(excluir.map(nombre => nombre.trim().toLowerCase()))
  for (const parte of (varyExistente || '').split(',')) {
    const nombre = parte.trim()
    if (nombre === '*') return '*'
    const clave = nombre.toLowerCase()
    if (nombre && !valoresExcluidos.has(clave)) valores.set(clave, nombre)
  }
  for (const nombre of agregar) {
    const clave = nombre.trim().toLowerCase()
    if (clave && !valoresExcluidos.has(clave) && !valores.has(clave)) {
      valores.set(clave, nombre.trim())
    }
  }
  return [...valores.values()].join(', ')
}

function tieneCookieSesionEditorial(cookie?: string): boolean {
  if (!cookie) return false
  return cookie.split(';').some((parte) => {
    const nombre = parte.trim().split('=', 1)[0]?.toLowerCase() || ''
    return nombre === 'pont3la10-auth' || nombre.startsWith('pont3la10-auth.')
  })
}
