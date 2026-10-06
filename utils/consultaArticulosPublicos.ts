type ConsultaRutaArticulos = Record<string, unknown>

const limitePaginaArticulos = 20

function obtenerValorUnico(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor.trim() || undefined : undefined
}

function obtenerSlug(valor: unknown): string | undefined {
  const slug = obtenerValorUnico(valor)?.toLocaleLowerCase('es-CO')
  return slug && slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? slug
    : undefined
}

export function construirConsultaArticulosPublicos(
  filtros: ConsultaRutaArticulos,
  desplazamiento = 0
) {
  const categoria = obtenerSlug(filtros.categoria)
  const tema = obtenerSlug(filtros.tema)
  const buscar = obtenerValorUnico(filtros.buscar)?.slice(0, 120)

  return {
    paginado: 'true',
    limite: limitePaginaArticulos,
    desplazamiento: Math.max(0, Math.floor(desplazamiento)),
    ...(categoria ? { categoria } : {}),
    ...(tema ? { tema } : {}),
    ...(buscar ? { buscar } : {})
  }
}
