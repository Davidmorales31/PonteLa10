export function normalizarTextoBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim()
}

export interface FiltrosConsultaArticulos {
  categoria?: string
  tema?: string
  buscar?: string
}

function leerFiltroTexto(valor: unknown, normalizar = false): string | undefined {
  if (typeof valor !== 'string') return undefined
  const texto = valor.trim()
  if (!texto) return undefined
  return normalizar ? texto.toLocaleLowerCase('es-CO') : texto
}

export function construirFiltrosConsultaArticulos(
  consulta: Record<string, unknown>
): FiltrosConsultaArticulos {
  const categoria = leerFiltroTexto(consulta.categoria, true)
  const tema = leerFiltroTexto(consulta.tema, true)
  const buscar = leerFiltroTexto(consulta.buscar)

  return {
    ...(categoria ? { categoria } : {}),
    ...(tema ? { tema } : {}),
    ...(buscar ? { buscar } : {})
  }
}

const aliasCategorias: Record<string, string[]> = {
  futbol: ['futbol'],
  'futbol mundial': ['futbol mundial', 'mundial 2026'],
  'futbol colombiano': ['futbol colombiano', 'seleccion colombia'],
  tecnologia: ['tecnologia', 'tech deportiva'],
  gaming: ['gaming'],
  tendencias: ['tendencias'],
  opinion: ['opinion']
}

const etiquetasCategorias: Record<string, string> = {
  futbol: 'fútbol',
  'futbol mundial': 'fútbol mundial',
  'futbol colombiano': 'fútbol colombiano',
  tecnologia: 'tecnología deportiva',
  gaming: 'gaming',
  tendencias: 'tendencias',
  opinion: 'opinión'
}

export function obtenerAliasCategoria(categoria: string): string[] {
  const categoriaNormalizada = normalizarTextoBusqueda(categoria.replaceAll('-', ' '))
  return aliasCategorias[categoriaNormalizada] || [categoriaNormalizada]
}

export function obtenerEtiquetaCategoria(categoria: string): string {
  const categoriaNormalizada = normalizarTextoBusqueda(categoria.replaceAll('-', ' '))
  return etiquetasCategorias[categoriaNormalizada] || categoria.replaceAll('-', ' ')
}

export function combinarArticulosPublicos<T extends { slug: string }>(
  existentes: readonly T[],
  nuevos: readonly T[]
): T[] {
  const slugs = new Set(existentes.map(articulo => articulo.slug))
  const articulosNuevos = nuevos.filter((articulo) => {
    if (slugs.has(articulo.slug)) return false
    slugs.add(articulo.slug)
    return true
  })

  return [...existentes, ...articulosNuevos]
}

export function aumentarNoticiasVisibles(
  actuales: number,
  disponibles: number,
  incremento = 6
): number {
  return Math.min(Math.max(actuales, 0) + Math.max(incremento, 1), Math.max(disponibles, 0))
}
