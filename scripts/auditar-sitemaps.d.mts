export interface SaltoRedireccion {
  desde: string
  estado: number
  hacia: string
}

export interface ResultadoHttpSitemap {
  estadoInicial: number | null
  estadoFinal: number | null
  urlFinal: string | null
  redirecciones: SaltoRedireccion[]
  cuerpo: string | null
  error: string | null
  bytesCuerpo?: number
  usoFallbackGet?: boolean
}

export interface IncidenciaSitemap {
  tipo: string
  url?: string
  estadoInicial?: number | null
  estadoFinal?: number | null
  redirecciones?: SaltoRedireccion[]
  error?: string | null
  fuentes?: string[]
  [clave: string]: unknown
}

export interface ResultadoAuditoriaSitemaps {
  origen: string | null
  sitemaps: number
  urlsEncontradas: number
  urlsComprobadas: number
  aliasComprobados: number
  aliasIncorrectos?: number
  incidencias: IncidenciaSitemap[]
  principalesUrlsRotas: Array<{ ruta: string; menciones: number }>
}

export function extraerLocsSitemap(xml: string, maximoLocs?: number): string[]
export function normalizarUrlSitemap(valor: string, origenCanonico: string): string | null
export function seguirRedirecciones(urlInicial: string, opciones?: {
  origenCanonico?: string
  metodo?: 'GET' | 'HEAD'
  fetchImpl?: typeof fetch
  maxRedirecciones?: number
  timeoutMs?: number
  maxBytesCuerpo?: number
  leerCuerpo?: boolean
}): Promise<ResultadoHttpSitemap>
export function auditarSitemaps(opciones?: {
  baseUrl?: string
  fetchImpl?: typeof fetch
  concurrencia?: number
  maximoUrls?: number
  maxBytesTotal?: number
  maximoLocs?: number
}): Promise<ResultadoAuditoriaSitemaps>
export function main(opciones?: Parameters<typeof auditarSitemaps>[0]): Promise<ResultadoAuditoriaSitemaps>
