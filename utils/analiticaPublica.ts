export const ID_MEDICION_GA4 = 'G-PHNWBM2D7X'
export type DecisionAnaliticaPublica = 'aceptada' | 'rechazada'
export type EstadoAnaliticaPublica = DecisionAnaliticaPublica | null

export type TipoPaginaPublica = 'home' | 'article' | 'match' | 'team' | 'competition' | 'player' | 'hub' | 'results' | 'search'

export interface ContextoAnaliticaPagina {
  ruta: string
  competition?: unknown
  match_status?: unknown
  category?: unknown
  primary_entity?: unknown
}

type ConsultaAnaliticaPagina = Record<string, unknown>

export function resolverDecisionAnalitica(valorGuardado: unknown): DecisionAnaliticaPublica {
  return valorGuardado === 'rechazada' ? 'rechazada' : 'aceptada'
}

export function resolverDecisionPublicidad(valorGuardado: unknown): DecisionAnaliticaPublica | null {
  return valorGuardado === 'aceptada' || valorGuardado === 'rechazada' ? valorGuardado : null
}

const CATEGORIAS_MEDIBLES = new Set([
  'colombia',
  'futbol',
  'futbol-colombiano',
  'futbol-mundial',
  'gaming',
  'opinion',
  'tecnologia',
  'tendencias'
])

const RUTAS_HUB = new Map<string, string>([
  ['/futbol-colombiano', 'futbol_colombiano'],
  ['/seleccion-colombia', 'seleccion_colombia'],
  ['/futbol-internacional', 'futbol_internacional'],
  ['/colombianos-en-europa', 'colombianos_en_europa'],
  ['/liga-colombiana', 'liga_colombiana'],
  ['/partidos-hoy', 'partidos_hoy']
])
const ESTADOS_PARTIDO_MEDIBLES = new Set(['scheduled', 'live', 'finished', 'cancelled', 'postponed', 'suspended'])

export function esRutaPublicaMedible(ruta: string): boolean {
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return false
  const rutaNormalizada = ruta.replace(/\/+$/, '') || '/'
  return !/^\/(admin|api|login|cuenta)(\/|$)/i.test(rutaNormalizada)
}

const ORIGENES_UTM_PERMITIDOS = new Set([
  'facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube', 'x', 'telegram',
  'threads', 'reddit', 'discord', 'newsletter'
])
const MEDIOS_UTM_PERMITIDOS = new Set([
  'organic_social', 'paid_social', 'social', 'referral', 'email', 'messaging', 'display'
])
const CONTENIDOS_UTM_PERMITIDOS = new Set([
  'post', 'feed', 'story', 'reel', 'carousel', 'video', 'image', 'whatsapp_status'
])

function normalizarUtmEnumerado(valor: unknown, permitidos: Set<string>): string | null {
  if (typeof valor !== 'string') return null
  const valorNormalizado = valor.trim().toLocaleLowerCase('en-US')
  return permitidos.has(valorNormalizado) ? valorNormalizado : null
}

export function construirUbicacionPaginaAnalitica(
  origen: string,
  ruta: string,
  consulta: ConsultaAnaliticaPagina = {}
): string {
  const rutaCanonica = ruta.split(/[?#]/, 1)[0] || '/'
  const origenNormalizado = origen.replace(/\/+$/, '')
  if (
    !/^https?:\/\/[^/?#]+$/i.test(origenNormalizado)
    || !esRutaPublicaMedible(rutaCanonica)
  ) return ''

  const slugPartido = rutaCanonica.match(/^\/partidos\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1]
  const origenUtm = normalizarUtmEnumerado(consulta.utm_source, ORIGENES_UTM_PERMITIDOS)
  const medioUtm = normalizarUtmEnumerado(consulta.utm_medium, MEDIOS_UTM_PERMITIDOS)
  const cantidadDigitosSlug = slugPartido?.replace(/\D/g, '').length || 0
  const campanaEsperada = slugPartido
    && slugPartido.length <= 80
    && cantidadDigitosSlug < 10
    ? `match-${slugPartido}`
    : null
  const campanaRecibida = typeof consulta.utm_campaign === 'string'
    ? consulta.utm_campaign.trim().toLocaleLowerCase('en-US')
    : null
  if (!origenUtm || !medioUtm || !campanaEsperada || campanaRecibida !== campanaEsperada) {
    return `${origenNormalizado}${rutaCanonica}`
  }

  const parametros = new URLSearchParams()
  parametros.set('utm_source', origenUtm)
  parametros.set('utm_medium', medioUtm)
  parametros.set('utm_campaign', campanaEsperada)
  const contenidoUtm = normalizarUtmEnumerado(consulta.utm_content, CONTENIDOS_UTM_PERMITIDOS)
  if (contenidoUtm) parametros.set('utm_content', contenidoUtm)

  const queryUtm = parametros.toString()
  return `${origenNormalizado}${rutaCanonica}${queryUtm ? `?${queryUtm}` : ''}`
}

export function normalizarCategoriaMedible(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const categoria = valor.trim().toLocaleLowerCase('en-US')
  return CATEGORIAS_MEDIBLES.has(categoria) ? categoria : null
}

export function construirDimensionesVistaPagina(
  ruta: string,
  consulta: ConsultaAnaliticaPagina = {},
  contexto?: ContextoAnaliticaPagina | null
): Record<string, string> {
  const rutaNormalizada = ruta.replace(/\/+$/, '') || '/'
  let tipoPagina: TipoPaginaPublica = 'hub'
  const dimensiones: Record<string, string> = {}

  if (rutaNormalizada === '/') {
    tipoPagina = 'home'
  } else if (rutaNormalizada === '/articulos' && obtenerConsultaTexto(consulta.buscar)) {
    tipoPagina = 'search'
  } else if (rutaNormalizada === '/articulos') {
    tipoPagina = 'hub'
    const categoria = normalizarCategoriaMedible(contexto?.category) || normalizarCategoriaMedible(consulta.categoria)
    if (categoria) dimensiones.category = categoria
    if (obtenerSlugAnalitico(consulta.tema)) dimensiones.topic = obtenerSlugAnalitico(consulta.tema)!
  } else if (rutaNormalizada.startsWith('/articulos/')) {
    tipoPagina = 'article'
    asignarIdentidad(dimensiones, 'content_id', rutaNormalizada.slice('/articulos/'.length))
    const categoria = normalizarCategoriaMedible(contexto?.category) || normalizarCategoriaMedible(consulta.categoria)
    if (categoria) dimensiones.category = categoria
    asignarIdentidad(dimensiones, 'primary_entity', contexto?.primary_entity)
  } else if (rutaNormalizada.startsWith('/partidos/')) {
    tipoPagina = 'match'
    asignarIdentidad(dimensiones, 'match_id', rutaNormalizada.slice('/partidos/'.length))
    asignarIdentidad(dimensiones, 'competition', contexto?.competition)
    const estado = normalizarEstadoPartidoMedible(contexto?.match_status)
    if (estado) dimensiones.match_status = estado
  } else if (rutaNormalizada.startsWith('/equipos/')) {
    tipoPagina = 'team'
    asignarIdentidad(dimensiones, 'team_id', rutaNormalizada.slice('/equipos/'.length))
  } else if (rutaNormalizada.startsWith('/competiciones/')) {
    tipoPagina = 'competition'
    asignarIdentidad(dimensiones, 'competition_id', rutaNormalizada.slice('/competiciones/'.length))
  } else if (rutaNormalizada.startsWith('/jugadores/')) {
    tipoPagina = 'player'
    asignarIdentidad(dimensiones, 'player_id', rutaNormalizada.slice('/jugadores/'.length))
  } else if (rutaNormalizada === '/resultados' || rutaNormalizada.startsWith('/resultados/')) {
    tipoPagina = 'results'
  } else if (RUTAS_HUB.has(rutaNormalizada)) {
    tipoPagina = 'hub'
    dimensiones.hub_type = RUTAS_HUB.get(rutaNormalizada)!
  }

  dimensiones.page_type = tipoPagina
  return dimensiones
}

function obtenerConsultaTexto(valor: unknown): boolean {
  return typeof valor === 'string' && Boolean(valor.trim())
}

function asignarIdentidad(destino: Record<string, string>, nombre: string, valor: unknown) {
  if (typeof valor !== 'string') return
  const identidad = valor.trim().toLocaleLowerCase('en-US')
  if (/^[a-z0-9][a-z0-9-]{0,79}$/.test(identidad)) destino[nombre] = identidad
}

function obtenerSlugAnalitico(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const slug = valor.trim().toLocaleLowerCase('en-US')
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) ? slug : null
}

function normalizarEstadoPartidoMedible(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const estado = valor.trim().toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ -]+/g, '_')
  if (['en_vivo', 'in_progress', 'live'].includes(estado)) return 'live'
  if (['finalizado', 'finished', 'full_time'].includes(estado)) return 'finished'
  if (['programado', 'scheduled', 'not_started'].includes(estado)) return 'scheduled'
  if (['cancelado', 'cancelled'].includes(estado)) return 'cancelled'
  if (['aplazado', 'postponed', 'reprogramado'].includes(estado)) return 'postponed'
  if (['suspendido', 'suspended'].includes(estado)) return 'suspended'
  return ESTADOS_PARTIDO_MEDIBLES.has(estado) ? estado : null
}
