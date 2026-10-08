import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

export interface PerfilAutorPublico {
  slug: string
  nombre: string
  tipo: 'Organization' | 'Person'
  biografia: string
  especialidades: string[]
  fechaActualizacion: string
  redesProfesionales: Array<{ nombre: string; url: string }>
}

// Solo se publican perfiles incorporados explícitamente con información
// verificable. Los nombres de usuario del CMS no bastan para crear perfiles.
const perfilesAutoresPublicos: PerfilAutorPublico[] = [
  {
    slug: 'equipo-pont3la10',
    nombre: 'Equipo Pont3la10',
    tipo: 'Organization',
    biografia: 'Equipo editorial de Pont3la10. Organiza noticias y datos deportivos con atención especial al fútbol colombiano, la Selección Colombia y sus protagonistas. Las herramientas automatizadas pueden apoyar la preparación, pero una persona autorizada revisa y aprueba el contenido antes de publicarlo.',
    especialidades: [
      'Fútbol colombiano',
      'Liga BetPlay',
      'Selección Colombia',
      'Colombianos en el exterior'
    ],
    fechaActualizacion: '2026-10-07',
    redesProfesionales: []
  }
]

function normalizarNombreAutor(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO')
}

export function obtenerPerfilAutorPorSlug(slug: string): PerfilAutorPublico | null {
  return perfilesAutoresPublicos.find(perfil => perfil.slug === slug) || null
}

export function obtenerPerfilAutorPublico(nombre: string): PerfilAutorPublico | null {
  const nombreNormalizado = normalizarNombreAutor(nombre)
  return perfilesAutoresPublicos.find(perfil =>
    normalizarNombreAutor(perfil.nombre) === nombreNormalizado
  ) || null
}

export function crearAutorEstructurado(nombre: string, urlSitio: string): {
  '@type': 'Organization' | 'Person'
  '@id'?: string
  name: string
  url?: string
} {
  const perfil = obtenerPerfilAutorPublico(nombre)
  const urlPerfil = perfil
    ? `${urlSitio.replace(/\/+$/, '')}/autores/${perfil.slug}`
    : undefined

  return {
    '@type': perfil?.tipo || 'Person',
    '@id': urlPerfil ? `${urlPerfil}#autor` : undefined,
    name: perfil?.nombre || nombre,
    url: urlPerfil
  }
}

export function filtrarArticulosDeAutor(
  articulos: ResumenArticuloPublico[],
  perfil: PerfilAutorPublico
): ResumenArticuloPublico[] {
  return articulos.filter(articulo =>
    normalizarNombreAutor(articulo.autorNombre) === normalizarNombreAutor(perfil.nombre)
  )
}
