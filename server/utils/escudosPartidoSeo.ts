const escudosInline = import.meta.glob('../assets/escudos-liga-colombiana/*.webp', {
  eager: true,
  import: 'default',
  query: '?inline'
}) as Record<string, string>

const aliasEquipo: Record<string, string> = {
  fortaleza: 'fortaleza-ceif',
  'fortaleza-fc': 'fortaleza-ceif',
  'junior-fc': 'junior',
  'junior-f-c': 'junior',
  'america-de-cali-fc': 'america-de-cali'
}

const escudosPorNombre = new Map(
  Object.entries(escudosInline).map(([ruta, contenido]) => [
    ruta.split('/').at(-1)?.replace(/\.webp$/, '') || '',
    contenido
  ])
)

/** Devuelve un escudo ya incluido en el bundle; no descarga URLs arbitrarias del fixture. */
export function obtenerEscudoPartidoSeo(nombreEquipo: string): string | null {
  const nombreNormalizado = slugEquipo(nombreEquipo)
  const nombreArchivo = aliasEquipo[nombreNormalizado] || nombreNormalizado
  return escudosPorNombre.get(nombreArchivo) || null
}

function slugEquipo(nombre: string): string {
  return nombre.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
