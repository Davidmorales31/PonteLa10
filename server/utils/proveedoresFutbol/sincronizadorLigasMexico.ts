import type { ClasificacionFutbolProveedor, EstadoFixtureFutbol, PartidoFutbolProveedor } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from './contrato'
import { claveEquipo } from '~/utils/claveEquipo'
import { inicioTemporadaLigaMx, ligasMexico, temporadaLigaMx, torneoLigaMx } from '~/data/ligaMx'

const TAMANO_PAGINA = 100
// Una temporada tiene ~330 partidos por liga; con 5 páginas (500) sobra y limita el gasto de cuota.
const MAX_PAGINAS_POR_LIGA = 5
const URL_FUENTE = 'https://goal-api.com/documentation'

export interface FilaPartidoLiga {
  site: 'mx'
  competition_slug: string
  season: string
  provider: 'goal-api'
  provider_fixture_id: string
  tournament: string
  round_name: string
  scheduled_at: string
  home_team: string
  away_team: string
  status: EstadoFixtureFutbol
  goals_home: number | null
  goals_away: number | null
  venue: string | null
  city: string | null
  source_name: 'Goal API'
  source_url: string
  checked_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
  updated_at: string
}

export interface FilaPosicionLiga {
  site: 'mx'
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
  source_name: 'Goal API'
  source_url: string
  checked_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
  updated_at: string
}

export interface RepositorioLigasMexico {
  upsertPartidos(filas: FilaPartidoLiga[]): Promise<void>
  upsertPosiciones(filas: FilaPosicionLiga[]): Promise<void>
}

export interface ResultadoLigasMexico {
  estado: 'completado' | 'parcial' | 'sin_datos' | 'fallido'
  solicitudes: number
  partidosGuardados: number
  posicionesGuardadas: number
  ligasProcesadas: number
  errorCode?: 'PROVEEDOR_NO_DISPONIBLE' | 'PAGINACION_INVALIDA' | 'LIMITE_PAGINAS' | 'SIN_DATOS' | 'GUARDADO_FALLIDO'
}

/**
 * Sincroniza calendario y tabla de las ligas de México con el proveedor GOAL API. El
 * calendario pagina desde lo más reciente y se detiene al llegar a temporadas anteriores;
 * si el orden cambia, el tope de páginas hace fallar la corrida de forma cerrada.
 */
export async function sincronizarLigasMexico(input: {
  proveedor: ProveedorFutbol
  repositorio: RepositorioLigasMexico
  derechosPublicacionConfirmados: boolean
  ahora?: () => Date
}): Promise<ResultadoLigasMexico> {
  const obtenerPagina = input.proveedor.obtenerFixturesLiga
  if (input.proveedor.id !== 'goal-api' || typeof obtenerPagina !== 'function') {
    return resultado('fallido', 0, 0, 0, 0, 'PROVEEDOR_NO_DISPONIBLE')
  }

  const ahora = (input.ahora || (() => new Date()))()
  const consultadoEn = ahora.toISOString()
  const temporadaActual = temporadaLigaMx(ahora)
  const inicioTemporada = inicioTemporadaLigaMx(temporadaActual)
  const partidos = new Map<string, FilaPartidoLiga>()
  const posiciones = new Map<string, FilaPosicionLiga>()
  let solicitudes = 0
  let ligasProcesadas = 0
  let errores = 0
  let primerError: ResultadoLigasMexico['errorCode']

  for (const liga of ligasMexico) {
    // Cada liga se acumula aparte y solo se incorpora completa: una liga que falla a medias no deja filas.
    const partidosLiga = new Map<string, FilaPartidoLiga>()
    const posicionesLiga = new Map<string, FilaPosicionLiga>()
    try {
      let offset = 0
      let pagina = 0
      const offsetsVistos = new Set<number>()
      while (true) {
        pagina += 1
        const respuesta = await obtenerPagina.call(input.proveedor, liga.idGoal, TAMANO_PAGINA, offset)
        solicitudes += respuesta.solicitudes ?? 1
        let hayDeLaTemporada = false
        for (const partido of respuesta.elementos) {
          const fila = mapearPartido(partido, liga.slug, temporadaActual, consultadoEn, input.derechosPublicacionConfirmados)
          if (!fila) continue
          hayDeLaTemporada = true
          partidosLiga.set(`${fila.competition_slug}:${fila.season}:${fila.provider_fixture_id}`, fila)
        }
        const instantes = respuesta.elementos.map(partido => Date.parse(partido.inicioUtc)).filter(Number.isFinite)
        const todaAnterior = instantes.length > 0 && instantes.every(instante => instante < inicioTemporada)
        if (todaAnterior && !hayDeLaTemporada) break
        if (!respuesta.siguienteCursor) break
        const siguiente = Number(respuesta.siguienteCursor)
        if (!Number.isInteger(siguiente) || siguiente <= offset || offsetsVistos.has(siguiente)) throw new Error('PAGINACION_INVALIDA')
        if (pagina >= MAX_PAGINAS_POR_LIGA) throw new Error('LIMITE_PAGINAS')
        offsetsVistos.add(siguiente)
        offset = siguiente
      }

      const tabla = await input.proveedor.obtenerClasificacion(liga.idGoal, temporadaActual)
      solicitudes += 1
      for (const fila of mapearTabla(tabla, liga.slug, temporadaActual, consultadoEn, input.derechosPublicacionConfirmados)) {
        posicionesLiga.set(`${fila.competition_slug}:${fila.phase}:${fila.team_key}`, fila)
      }
      for (const [clave, fila] of partidosLiga) partidos.set(clave, fila)
      for (const [clave, fila] of posicionesLiga) posiciones.set(clave, fila)
      ligasProcesadas += 1
    } catch (error) {
      errores += 1
      primerError ||= leerErrorSeguro(error)
      solicitudes += leerSolicitudes(error)
    }
  }

  if (!partidos.size && !posiciones.size) {
    return resultado('sin_datos', solicitudes, 0, 0, ligasProcesadas, primerError || 'SIN_DATOS')
  }

  try {
    if (partidos.size) await input.repositorio.upsertPartidos([...partidos.values()])
    if (posiciones.size) await input.repositorio.upsertPosiciones([...posiciones.values()])
  } catch {
    return resultado('fallido', solicitudes, 0, 0, ligasProcesadas, 'GUARDADO_FALLIDO')
  }

  return resultado(errores ? 'parcial' : 'completado', solicitudes, partidos.size, posiciones.size, ligasProcesadas,
    errores ? primerError || 'PROVEEDOR_NO_DISPONIBLE' : undefined)
}

function resultado(
  estado: ResultadoLigasMexico['estado'], solicitudes: number, partidosGuardados: number,
  posicionesGuardadas: number, ligasProcesadas: number, errorCode?: ResultadoLigasMexico['errorCode']
): ResultadoLigasMexico {
  return { estado, solicitudes, partidosGuardados, posicionesGuardadas, ligasProcesadas, ...(errorCode ? { errorCode } : {}) }
}

export { claveEquipo }

function normalizarMarcador(valor: number | null): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 99 ? valor : null
}

export function mapearPartido(
  partido: PartidoFutbolProveedor, competencia: string, temporadaActual: string,
  checkedAt: string, derechosConfirmados: boolean
): FilaPartidoLiga | null {
  const instante = Date.parse(partido.inicioUtc)
  if (!Number.isFinite(instante)) return null
  const fecha = new Date(instante)
  // Solo la temporada en curso: el proveedor también devuelve temporadas anteriores.
  if (temporadaLigaMx(fecha) !== temporadaActual) return null

  const id = partido.idProveedor.trim()
  const local = partido.local.nombre.trim().slice(0, 120)
  const visitante = partido.visitante.nombre.trim().slice(0, 120)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 120
    || local.length < 2 || visitante.length < 2 || claveEquipo(local) === claveEquipo(visitante)) return null

  const jornadaProveedor = (partido.competencia.jornada || partido.competencia.etapa || '').trim()
  const jornada = /^\d{1,2}$/.test(jornadaProveedor) ? `Jornada ${jornadaProveedor}` : jornadaProveedor.slice(0, 120) || 'Por confirmar'

  return {
    site: 'mx',
    competition_slug: competencia,
    season: temporadaActual,
    provider: 'goal-api',
    provider_fixture_id: id,
    tournament: torneoLigaMx(fecha),
    round_name: jornada,
    scheduled_at: fecha.toISOString(),
    home_team: local,
    away_team: visitante,
    status: partido.estado,
    goals_home: normalizarMarcador(partido.golesLocal),
    goals_away: normalizarMarcador(partido.golesVisitante),
    venue: partido.sede?.trim().slice(0, 160) || null,
    city: partido.ciudad?.trim().slice(0, 120) || null,
    source_name: 'Goal API',
    source_url: URL_FUENTE,
    checked_at: checkedAt,
    is_public: derechosConfirmados,
    publication_rights_confirmed: derechosConfirmados,
    updated_at: checkedAt
  }
}

export function mapearTabla(
  tabla: ClasificacionFutbolProveedor | null, competencia: string, temporadaActual: string,
  checkedAt: string, derechosConfirmados: boolean
): FilaPosicionLiga[] {
  if (!tabla) return []
  const filas: FilaPosicionLiga[] = []
  for (const grupo of tabla.grupos) {
    const fase = (grupo.etapa || grupo.nombre || 'General').trim().slice(0, 80)
    if (fase.length < 2) continue
    for (const fila of grupo.filas) {
      const nombre = fila.equipo.nombre.trim().slice(0, 120)
      const clave = claveEquipo(nombre)
      const numeros = [fila.posicion, fila.jugados, fila.ganados, fila.empatados, fila.perdidos, fila.golesFavor, fila.golesContra, fila.diferenciaGoles, fila.puntos]
      if (nombre.length < 2 || !clave || numeros.some(numero => !Number.isInteger(numero))
        || fila.posicion < 1 || fila.posicion > 64 || fila.jugados < 0 || fila.jugados > 80) continue
      filas.push({
        site: 'mx',
        competition_slug: competencia,
        season: temporadaActual,
        phase: fase,
        team_key: clave,
        team_name: nombre,
        position: fila.posicion,
        played: fila.jugados,
        won: fila.ganados,
        drawn: fila.empatados,
        lost: fila.perdidos,
        goals_for: fila.golesFavor,
        goals_against: fila.golesContra,
        goal_difference: fila.diferenciaGoles,
        points: fila.puntos,
        source_name: 'Goal API',
        source_url: URL_FUENTE,
        checked_at: checkedAt,
        is_public: derechosConfirmados,
        publication_rights_confirmed: derechosConfirmados,
        updated_at: checkedAt
      })
    }
  }
  return filas
}

function leerErrorSeguro(error: unknown): ResultadoLigasMexico['errorCode'] {
  const mensaje = error instanceof Error ? error.message : ''
  if (mensaje === 'PAGINACION_INVALIDA' || mensaje === 'LIMITE_PAGINAS') return mensaje
  return 'PROVEEDOR_NO_DISPONIBLE'
}

function leerSolicitudes(error: unknown): number {
  const valor = error && typeof error === 'object' ? (error as { solicitudesConsumidas?: unknown }).solicitudesConsumidas : 0
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : 0
}
