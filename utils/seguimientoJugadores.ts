import { jugadoresColombianosEuropa } from '~/data/jugadoresColombianosEuropa'

export const MAX_JUGADORES_SEGUIDOS = 12

const slugsJugadoresPublicos = new Set(jugadoresColombianosEuropa.map(jugador => jugador.slug))

export function esSlugJugadorSeguible(valor: unknown): valor is string {
  return typeof valor === 'string'
    && valor.length <= 80
    && slugsJugadoresPublicos.has(valor)
}

export function normalizarSlugsJugadoresSeguidos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []

  return [...new Set(valor.filter(esSlugJugadorSeguible))]
    .slice(0, MAX_JUGADORES_SEGUIDOS)
}

export function alternarSlugJugadorSeguido(slugs: string[], slug: string): string[] {
  const normalizados = normalizarSlugsJugadoresSeguidos(slugs)
  if (!esSlugJugadorSeguible(slug)) return normalizados
  if (normalizados.includes(slug)) return normalizados.filter(item => item !== slug)
  if (normalizados.length >= MAX_JUGADORES_SEGUIDOS) return normalizados

  return [...normalizados, slug]
}
