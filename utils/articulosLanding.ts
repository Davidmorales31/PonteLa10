import { articuloDestacadoLanding, articulosRecientesLanding } from '~/data/landing.mock'
import type { ArticuloLanding } from '~/types/landing'
import type { ArticuloResumen } from '~/types/editorial'

export const articulosLanding = [articuloDestacadoLanding, ...articulosRecientesLanding]

export function convertirArticuloLandingAResumen(articulo: ArticuloLanding): ArticuloResumen {
  return {
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen || 'Una jugada para entender el deporte desde otra cancha.',
    categoria: articulo.categoria,
    autor: 'Mesa Pont3la10',
    publicadoHace: articulo.publicadoHace,
    lecturaMinutos: Number.parseInt(articulo.tiempoLectura, 10) || 3,
    imagen: articulo.imagen
  }
}

export function obtenerArticuloLandingPorSlug(slug: string): ArticuloLanding | undefined {
  return articulosLanding.find(articulo => articulo.slug === slug)
}

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
