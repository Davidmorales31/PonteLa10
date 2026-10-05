export interface IdentidadPartidoSeo {
  provider: string
  provider_fixture_id: string
  competition_slug: string
  season: string
  round_name: string | null
  home_team: string
  away_team: string
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

export function buscarPartidoSeoPorSlug<T extends { slug: string }>(partidos: readonly T[], slug: string): T | undefined {
  return partidos.find(partido => partido.slug === slug)
}

export function asignarSlugsPartidosSeo<T extends IdentidadPartidoSeo>(
  partidos: readonly T[]
): Array<T & { slug: string }> {
  const grupos = new Map<string, T[]>()
  for (const partido of partidos) {
    const base = crearSlugBasePartido(partido)
    grupos.set(base, [...(grupos.get(base) || []), partido])
  }

  return [...grupos.entries()].flatMap(([base, grupo]) => {
    if (grupo.length === 1) return [{ ...grupo[0]!, slug: base }]

    return grupo.map(partido => ({
      ...partido,
      slug: [
        base,
        slugTextoPartido(partido.competition_slug),
        slugTextoPartido(partido.season),
        slugTextoPartido(partido.round_name || 'fixture'),
        slugTextoPartido(partido.provider),
        slugTextoPartido(partido.provider_fixture_id)
      ].filter(Boolean).join('-')
    }))
  })
}
