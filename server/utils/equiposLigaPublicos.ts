import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listarArticulosPublicosPorEntidad } from '~/server/utils/repositorioContenidoEditorial'
import { listarPartidosSeoPublicos, normalizarClaveEquipoLiga } from '~/server/utils/partidosSeoPublicos'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import { evaluarFrescuraTabla, type EvaluacionFrescuraDeportiva } from '~/utils/frescuraDatosDeportivos'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

type FilaClasificacionEquipo = {
  competition_slug: string
  season: string
  phase: string
  team_key: string
  team_name: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  team_logo_url: string | null
  checked_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

type FilaClasificacionEquipoPublica = FilaClasificacionEquipo & {
  competition_slug: 'liga-betplay' | 'torneo-betplay'
}

export interface ClasificacionEquipoPublica {
  competencia: 'liga-betplay' | 'torneo-betplay'
  temporada: string
  fase: string
  posicion: number
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferencia: number
  puntos: number
  verificadoEn: string
}

export interface EquipoLigaPublico {
  slug: string
  nombre: string
  escudo: string | null
  clasificaciones: ClasificacionEquipoPublica[]
  actualizadoEn: string
}

export interface FichaEquipoLigaPublica {
  equipo: EquipoLigaPublico
  indexable: boolean
  frescuraTabla: EvaluacionFrescuraDeportiva
  partidosPublicos: number
  sedeVerificada: { estadio: string, ciudad: string | null, verificadoEn: string, fuenteOficialUrl: string } | null
  partidosEnVivo: PartidoSeoPublico[]
  proximosPartidos: PartidoSeoPublico[]
  resultadosRecientes: PartidoSeoPublico[]
  noticias: ResumenArticuloPublico[]
}

const columnasClasificacion = [
  'competition_slug', 'season', 'phase', 'team_key', 'team_name', 'position',
  'played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against', 'goal_difference',
  'points', 'team_logo_url', 'checked_at', 'is_public', 'publication_rights_confirmed'
].join(',')

export async function listarEquiposLigaPublicos(cliente: SupabaseClient): Promise<EquipoLigaPublico[]> {
  const { data, error } = await cliente.from('colombian_league_standings')
    .select(columnasClasificacion)
    .eq('is_public', true)
    .eq('publication_rights_confirmed', true)
    .order('checked_at', { ascending: false })
    .limit(500)

  if (error || !Array.isArray(data)) {
    throw createError({ statusCode: 503, message: 'La clasificación pública no está disponible.' })
  }

  return proyectarEquiposLigaPublicos(data as unknown as FilaClasificacionEquipo[])
}

export function proyectarEquiposLigaPublicos(filas: FilaClasificacionEquipo[]): EquipoLigaPublico[] {
  const equipos = new Map<string, EquipoLigaPublico>()
  const clavesClasificacion = new Set<string>()

  for (const fila of [...filas].sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at))) {
    if (!esFilaClasificacionPublica(fila)) continue

    const claveEquipo = fila.team_key
    const equipo = equipos.get(claveEquipo) || {
      slug: claveEquipo,
      nombre: fila.team_name.trim(),
      escudo: normalizarEscudoPublico(fila.team_logo_url),
      clasificaciones: [],
      actualizadoEn: new Date(fila.checked_at).toISOString()
    }
    if (!equipo.escudo) equipo.escudo = normalizarEscudoPublico(fila.team_logo_url)

    const claveClasificacion = [fila.competition_slug, fila.season, fila.phase, fila.team_key].join('|')
    if (!clavesClasificacion.has(claveClasificacion)) {
      equipo.clasificaciones.push({
        competencia: fila.competition_slug,
        temporada: fila.season,
        fase: fila.phase,
        posicion: fila.position,
        jugados: fila.played,
        ganados: fila.won,
        empatados: fila.drawn,
        perdidos: fila.lost,
        golesFavor: fila.goals_for,
        golesContra: fila.goals_against,
        diferencia: fila.goal_difference,
        puntos: fila.points,
        verificadoEn: new Date(fila.checked_at).toISOString()
      })
      clavesClasificacion.add(claveClasificacion)
    }

    equipos.set(claveEquipo, equipo)
  }

  return [...equipos.values()].map(equipo => ({
    ...equipo,
    clasificaciones: equipo.clasificaciones.sort((a, b) =>
      Date.parse(b.verificadoEn) - Date.parse(a.verificadoEn)
      || a.competencia.localeCompare(b.competencia)
      || a.fase.localeCompare(b.fase)
    )
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CO'))
}

export async function obtenerFichaEquipoLigaPublica(
  cliente: SupabaseClient,
  slug: string,
  ahoraMs = Date.now()
): Promise<FichaEquipoLigaPublica | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null

  const equipos = await listarEquiposLigaPublicos(cliente)
  const equipo = equipos.find(item => item.slug === slug)
  if (!equipo) return null

  const partidos = await listarPartidosSeoPublicos(cliente)
  const clave = normalizarClaveEquipoLiga(equipo.nombre)
  const relacionados = partidos.filter(partido =>
    normalizarClaveEquipoLiga(partido.local) === clave
    || normalizarClaveEquipoLiga(partido.visitante) === clave
  )
  const enVivo = seleccionarPartidosEnVivoEquipo(relacionados, clave)
  const proximos = relacionados
    .filter((partido) => {
      const fecha = Date.parse(partido.fechaIso)
      const estado = etiquetaEstadoSeoPartido(partido.estado)
      return fecha >= ahoraMs && !['FINALIZADO', 'CANCELADO', 'APLAZADO', 'SUSPENDIDO', 'ABANDONADO'].includes(estado)
    })
    .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))
    .slice(0, 5)
  const resultados = seleccionarResultadosRecientesEquipo(relacionados, clave, ahoraMs)
  const partidoSede = seleccionarSedeVerificada(relacionados, clave)
  const clasificacionPrincipal = equipo.clasificaciones[0]
  const noticias = await buscarNoticiasEquipo(cliente, equipo.slug)
  const frescuraTabla = evaluarFrescuraTabla(clasificacionPrincipal?.verificadoEn, ahoraMs)

  return {
    equipo,
    frescuraTabla,
    indexable: evaluarIndexabilidad({
      tipo: 'equipo',
      slug: equipo.slug,
      nombre: equipo.nombre,
      competencia: clasificacionPrincipal?.competencia || '',
      temporada: clasificacionPrincipal?.temporada || '',
      escudo: equipo.escudo,
      posicionVerificadaEn: clasificacionPrincipal?.verificadoEn || null,
      partidosPublicos: relacionados.length
    }, ahoraMs),
    partidosPublicos: relacionados.length,
    sedeVerificada: partidoSede?.estadio
      ? {
          estadio: partidoSede.estadio,
          ciudad: partidoSede.ciudad,
          verificadoEn: partidoSede.verificadoEn,
          fuenteOficialUrl: partidoSede.fuenteOficialUrl!
        }
      : null,
    partidosEnVivo: enVivo,
    proximosPartidos: proximos,
    resultadosRecientes: resultados,
    noticias
  }
}

export function seleccionarSedeVerificada(
  partidos: PartidoSeoPublico[],
  claveEquipo: string,
  ahoraMs = Date.now()
): PartidoSeoPublico | null {
  return [...partidos]
    .filter(partido => normalizarClaveEquipoLiga(partido.local) === claveEquipo
      && Boolean(partido.estadio?.trim() && partido.fuenteOficialUrl)
      && Number.isFinite(Date.parse(partido.verificadoEn))
      && Date.parse(partido.verificadoEn) <= ahoraMs)
    .sort((a, b) => Date.parse(b.verificadoEn) - Date.parse(a.verificadoEn))[0] || null
}

export function seleccionarPartidosEnVivoEquipo(
  partidos: PartidoSeoPublico[],
  claveEquipo: string
): PartidoSeoPublico[] {
  return partidos
    .filter(partido => (normalizarClaveEquipoLiga(partido.local) === claveEquipo
      || normalizarClaveEquipoLiga(partido.visitante) === claveEquipo)
      && etiquetaEstadoSeoPartido(partido.estado) === 'EN VIVO')
    .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))
    .slice(0, 3)
}

export function seleccionarResultadosRecientesEquipo(
  partidos: PartidoSeoPublico[],
  claveEquipo: string,
  ahoraMs = Date.now()
): PartidoSeoPublico[] {
  return partidos
    .filter(partido => (normalizarClaveEquipoLiga(partido.local) === claveEquipo
      || normalizarClaveEquipoLiga(partido.visitante) === claveEquipo)
      && etiquetaEstadoSeoPartido(partido.estado) === 'FINALIZADO'
      && Number.isFinite(Date.parse(partido.fechaIso))
      && Date.parse(partido.fechaIso) <= ahoraMs
      && Number.isFinite(partido.golesLocal) && Number.isFinite(partido.golesVisitante))
    .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
    .slice(0, 5)
}

function esFilaClasificacionPublica(fila: FilaClasificacionEquipo): fila is FilaClasificacionEquipoPublica {
  return fila.is_public === true
    && fila.publication_rights_confirmed === true
    && typeof fila.competition_slug === 'string'
    && ['liga-betplay', 'torneo-betplay'].includes(fila.competition_slug)
    && typeof fila.season === 'string' && /^20\d{2}(?:-[A-Za-z0-9]+)?$/.test(fila.season)
    && typeof fila.phase === 'string' && fila.phase.trim().length > 0
    && typeof fila.team_key === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fila.team_key)
    && typeof fila.team_name === 'string' && fila.team_name.trim().length >= 2
    && Number.isInteger(fila.position) && fila.position > 0
    && Number.isInteger(fila.played) && fila.played >= 0
    && Number.isInteger(fila.won) && fila.won >= 0
    && Number.isInteger(fila.drawn) && fila.drawn >= 0
    && Number.isInteger(fila.lost) && fila.lost >= 0
    && Number.isInteger(fila.goals_for) && fila.goals_for >= 0
    && Number.isInteger(fila.goals_against) && fila.goals_against >= 0
    && Number.isInteger(fila.goal_difference)
    && Number.isInteger(fila.points) && fila.points >= 0
    && Number.isFinite(Date.parse(fila.checked_at))
}

function normalizarEscudoPublico(valor: string | null): string | null {
  return typeof valor === 'string'
    && /^\/images\/escudos\/liga-colombiana\/[a-z0-9-]+\.png$/.test(valor)
    ? valor
    : null
}

async function buscarNoticiasEquipo(
  cliente: SupabaseClient,
  slug: string
): Promise<ResumenArticuloPublico[]> {
  try {
    return await listarArticulosPublicosPorEntidad(cliente, 'team', slug, 4)
  } catch {
    // El hub no debe mostrar noticias cuya relación editorial no se confirmó.
    return []
  }
}
