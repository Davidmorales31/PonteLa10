export interface IdentidadPartidoSeo {
  provider: string
  provider_fixture_id: string
  competition_slug: string
  season: string
  round_name: string | null
  home_team: string
  away_team: string
  created_at?: string | null
}

export function slugTextoPartido(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function crearSlugBasePartido(partido: Pick<IdentidadPartidoSeo, 'home_team' | 'away_team'>): string {
  return `${slugTextoPartido(partido.home_team)}-vs-${slugTextoPartido(partido.away_team)}`
}

export function buscarPartidoSeoPorSlug<T extends { slug: string, slugsAlternos?: readonly string[] }>(
  partidos: readonly T[],
  slug: string
): T | undefined {
  return partidos.find(partido => partido.slug === slug)
    || partidos.find(partido => partido.slugsAlternos?.includes(slug))
}

export function asignarSlugsPartidosSeo<T extends IdentidadPartidoSeo>(
  partidos: readonly T[]
): Array<T & { slug: string, slugsAlternos: string[] }> {
  const grupos = new Map<string, T[]>()
  for (const partido of partidos) {
    const base = crearSlugBasePartido(partido)
    grupos.set(base, [...(grupos.get(base) || []), partido])
  }

  return [...grupos.entries()].flatMap(([base, grupo]) => {
    if (grupo.length === 1) return [{ ...grupo[0]!, slug: base, slugsAlternos: [] }]

    const grupoEstable = [...grupo].sort(compararIdentidadEstable)
    const slugsAsignados = new Set<string>()
    const asignacionPorPartido = new Map<T, { slug: string, slugsAlternos: string[] }>()

    grupoEstable.forEach((partido, indice) => {
      const slugCorto = indice === 0 ? base : crearSlugColision(base, partido)
      const slug = slugsAsignados.has(slugCorto)
        ? `${slugCorto}-${hashIdentidadFixture(partido)}`
        : slugCorto
      slugsAsignados.add(slug)

      const slugLegado = crearSlugColisionLegado(base, partido)
      asignacionPorPartido.set(partido, {
        slug,
        slugsAlternos: slugLegado === slug ? [] : [slugLegado]
      })
    })

    return grupo.map(partido => ({ ...partido, ...asignacionPorPartido.get(partido)! }))
  })
}

/** Conserva la primera URL corta y agrega sólo competencia/temporada al repetir el cruce. */
function crearSlugColision(base: string, partido: IdentidadPartidoSeo): string {
  return [base, slugTextoPartido(partido.competition_slug), slugTextoPartido(partido.season)]
    .filter(Boolean)
    .join('-')
    || `${base}-${hashIdentidadFixture(partido)}`
}

/** Resuelve URLs largas publicadas por la estrategia previa sin cambiar el fixture. */
function crearSlugColisionLegado(base: string, partido: IdentidadPartidoSeo): string {
  return [
    base,
    slugTextoPartido(partido.competition_slug),
    slugTextoPartido(partido.season),
    slugTextoPartido(partido.round_name || 'fixture'),
    slugTextoPartido(partido.provider),
    slugTextoPartido(partido.provider_fixture_id)
  ].filter(Boolean).join('-')
}

function compararIdentidadEstable(a: IdentidadPartidoSeo, b: IdentidadPartidoSeo): number {
  const fechaA = a.created_at ? Date.parse(a.created_at) : Number.POSITIVE_INFINITY
  const fechaB = b.created_at ? Date.parse(b.created_at) : Number.POSITIVE_INFINITY
  if (Number.isFinite(fechaA) && Number.isFinite(fechaB) && fechaA !== fechaB) return fechaA - fechaB
  if (Number.isFinite(fechaA) !== Number.isFinite(fechaB)) return Number.isFinite(fechaA) ? -1 : 1

  const identidadA = `${a.provider}:${a.provider_fixture_id}`
  const identidadB = `${b.provider}:${b.provider_fixture_id}`
  return identidadA < identidadB ? -1 : identidadA > identidadB ? 1 : 0
}

function hashIdentidadFixture(partido: IdentidadPartidoSeo): string {
  const valor = `${partido.provider}:${partido.provider_fixture_id}`
  let hash = 2_166_136_261
  for (let indice = 0; indice < valor.length; indice++) {
    hash = Math.imul(hash ^ valor.charCodeAt(indice), 16_777_619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}
