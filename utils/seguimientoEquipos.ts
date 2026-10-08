export const MAX_EQUIPOS_SEGUIDOS = 12

const patronSlugEquipo = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function esSlugEquipoSeguible(valor: unknown): valor is string {
  return typeof valor === 'string'
    && valor.length <= 80
    && patronSlugEquipo.test(valor)
}

export function normalizarSlugsEquiposSeguidos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []

  return [...new Set(valor.filter(esSlugEquipoSeguible))]
    .slice(0, MAX_EQUIPOS_SEGUIDOS)
}

export function leerSlugsEquiposSeguidos(valor: unknown): string[] | null {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 1000) return null

  const slugs = valor.split(',')
  if (slugs.length > MAX_EQUIPOS_SEGUIDOS || slugs.some(slug => !esSlugEquipoSeguible(slug))) return null

  return [...new Set(slugs)]
}

export function alternarSlugEquipoSeguido(slugs: string[], slug: string): string[] {
  const normalizados = normalizarSlugsEquiposSeguidos(slugs)
  if (!esSlugEquipoSeguible(slug)) return normalizados
  if (normalizados.includes(slug)) return normalizados.filter(item => item !== slug)
  if (normalizados.length >= MAX_EQUIPOS_SEGUIDOS) return normalizados

  return [...normalizados, slug]
}
