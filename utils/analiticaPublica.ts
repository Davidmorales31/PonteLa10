export const ID_MEDICION_GA4 = 'G-PHNWBM2D7X'
export type DecisionAnaliticaPublica = 'aceptada' | 'rechazada'
export type EstadoAnaliticaPublica = DecisionAnaliticaPublica | null

export function resolverDecisionAnalitica(valorGuardado: unknown): DecisionAnaliticaPublica {
  return valorGuardado === 'rechazada' ? 'rechazada' : 'aceptada'
}

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
