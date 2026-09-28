const ID_MEDICION_GA4 = /^G-[A-Z0-9]{10}$/i

const CATEGORIAS_MEDIBLES = new Set([
  'colombia',
  'futbol',
  'futbol-colombiano',
  'futbol-mundial',
  'gaming',
  'opinion',
  'tecnologia',
  'tendencias'
])

export function normalizarIdMedicionGa4(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const id = valor.trim()
  return ID_MEDICION_GA4.test(id) ? id : null
}

export function esRutaPublicaMedible(ruta: string): boolean {
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return false
  const rutaNormalizada = ruta.replace(/\/+$/, '') || '/'
  return !/^\/(admin|api|login|cuenta)(\/|$)/i.test(rutaNormalizada)
}

export function normalizarCategoriaMedible(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const categoria = valor.trim().toLocaleLowerCase('en-US')
  return CATEGORIAS_MEDIBLES.has(categoria) ? categoria : null
}
