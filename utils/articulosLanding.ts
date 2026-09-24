export function normalizarTextoBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim()
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
