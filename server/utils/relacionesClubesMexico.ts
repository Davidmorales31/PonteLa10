import type { SupabaseClient } from '@supabase/supabase-js'
import type { RelacionEntidadSeoPublica } from '~/types/contenidoEditorial'
import { claveEquipo } from '~/utils/claveEquipo'

export interface ClubMexicoRelacionable {
  clave: string
  nombre: string
}

function normalizar(texto: string): string {
  return ` ${texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

/** Variantes con las que un club suele nombrarse (sin «Club», «CF», «FC»), de 4 letras o más. */
function variantes(nombre: string): string[] {
  const completo = normalizar(nombre).trim()
  const corto = completo.replace(/^(club|cf|fc|cd|cs)\s+/, '').replace(/\s+(fc|cf|sc)$/, '')
  return [...new Set([completo, corto])].filter(variante => variante.length >= 4)
}

/**
 * Clubes de la Liga MX nombrados en el texto, como enlaces «mentions» a `/clubes/{clave}`.
 * Los nombres salen de la tabla pública del proveedor; solo coincide el nombre completo de una palabra o más.
 */
export function relacionarClubesMexico(texto: string, clubes: ClubMexicoRelacionable[], maximo = 4): RelacionEntidadSeoPublica[] {
  const cuerpo = normalizar(texto)
  const encontrados: Array<{ club: ClubMexicoRelacionable, posicion: number }> = []
  for (const club of clubes) {
    const posiciones = variantes(club.nombre).map(variante => cuerpo.indexOf(` ${variante} `)).filter(p => p >= 0)
    if (posiciones.length) encontrados.push({ club, posicion: Math.min(...posiciones) })
  }
  return encontrados
    .sort((a, b) => a.posicion - b.posicion)
    .slice(0, maximo)
    .map(({ club }) => ({ tipo: 'team' as const, slug: club.clave, nombre: club.nombre, ruta: `/clubes/${club.clave}`, relacion: 'mentions' as const }))
}

/** Clubes de la Liga MX con tabla pública (derechos confirmados); vacío si la consulta falla. */
export async function listarClubesMexicoPublicos(cliente: SupabaseClient): Promise<ClubMexicoRelacionable[]> {
  const { data, error } = await cliente.from('league_standings')
    .select('team_key,team_name,season')
    .eq('site', 'mx').eq('competition_slug', 'liga-mx')
    .eq('is_public', true).eq('publication_rights_confirmed', true)
    .order('season', { ascending: false }).limit(60)
  if (error || !data) return []
  const clubes = new Map<string, ClubMexicoRelacionable>()
  for (const fila of data as Array<{ team_key: string | null, team_name: string | null }>) {
    const nombre = String(fila.team_name || '').trim()
    const clave = fila.team_key || claveEquipo(nombre)
    if (nombre && clave && !clubes.has(clave)) clubes.set(clave, { clave, nombre })
  }
  return [...clubes.values()]
}
