import {
  catalogoCompeticionesPublicas,
  type SlugCompeticionPublica
} from '~/data/competicionesPublicas'

export const MAX_COMPETICIONES_SEGUIDAS = Object.keys(catalogoCompeticionesPublicas).length

export interface PartidoCompeticionSeguida {
  slug: string
  local: string
  visitante: string
  fechaIso: string
  golesLocal: number | null
  golesVisitante: number | null
}

export interface CompeticionSeguidaPortada {
  slug: SlugCompeticionPublica
  nombre: string
  partidoEnVivo: PartidoCompeticionSeguida | null
  proximoPartido: PartidoCompeticionSeguida | null
  resultadoReciente: PartidoCompeticionSeguida | null
  error: boolean
}

const patronSlugPartido = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function esSlugCompeticionSeguible(valor: unknown): valor is SlugCompeticionPublica {
  return typeof valor === 'string'
    && Object.hasOwn(catalogoCompeticionesPublicas, valor)
}

export function normalizarSlugsCompeticionesSeguidas(valor: unknown): SlugCompeticionPublica[] {
  if (!Array.isArray(valor)) return []

  return [...new Set(valor.filter(esSlugCompeticionSeguible))]
    .slice(0, MAX_COMPETICIONES_SEGUIDAS)
}

export function alternarSlugCompeticionSeguida(
  slugs: unknown,
  slug: unknown
): SlugCompeticionPublica[] {
  const normalizados = normalizarSlugsCompeticionesSeguidas(slugs)
  if (!esSlugCompeticionSeguible(slug)) return normalizados
  if (normalizados.includes(slug)) return normalizados.filter(item => item !== slug)
  if (normalizados.length >= MAX_COMPETICIONES_SEGUIDAS) return normalizados

  return [...normalizados, slug]
}

export function crearResumenCompeticionSeguida(
  slug: unknown,
  ficha: unknown
): CompeticionSeguidaPortada | null {
  if (!esSlugCompeticionSeguible(slug) || !esObjeto(ficha) || !esObjeto(ficha.competencia)) return null
  if (ficha.competencia.slug !== slug) return null

  return {
    slug,
    nombre: catalogoCompeticionesPublicas[slug].nombre,
    partidoEnVivo: primerPartido(ficha.partidosEnVivo),
    proximoPartido: primerPartido(ficha.proximosPartidos),
    resultadoReciente: primerPartido(ficha.resultadosRecientes),
    error: false
  }
}

export function crearResumenCompeticionSinDatos(slug: unknown): CompeticionSeguidaPortada | null {
  if (!esSlugCompeticionSeguible(slug)) return null

  return {
    slug,
    nombre: catalogoCompeticionesPublicas[slug].nombre,
    partidoEnVivo: null,
    proximoPartido: null,
    resultadoReciente: null,
    error: true
  }
}

function primerPartido(valor: unknown): PartidoCompeticionSeguida | null {
  if (!Array.isArray(valor)) return null
  const partido = valor.find((elemento) => {
    if (!esObjeto(elemento)) return false
    return typeof elemento.slug === 'string'
      && patronSlugPartido.test(elemento.slug)
      && typeof elemento.local === 'string'
      && typeof elemento.visitante === 'string'
      && Number.isFinite(Date.parse(String(elemento.fechaIso)))
  })

  if (!esObjeto(partido)) return null
  return {
    slug: String(partido.slug),
    local: String(partido.local),
    visitante: String(partido.visitante),
    fechaIso: String(partido.fechaIso),
    golesLocal: typeof partido.golesLocal === 'number' && Number.isFinite(partido.golesLocal) ? partido.golesLocal : null,
    golesVisitante: typeof partido.golesVisitante === 'number' && Number.isFinite(partido.golesVisitante) ? partido.golesVisitante : null
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}
