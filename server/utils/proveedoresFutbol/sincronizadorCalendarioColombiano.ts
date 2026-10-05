import type { PartidoFutbolProveedor } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from './contrato'
import { LIGAS_CALENDARIO_COLOMBIANO_GOAL } from './ligasPrioritariasGoal'

const TAMANO_PAGINA = 100
// Hasta 800 fixtures por torneo; dos intentos diarios limitan esta lane a
// 48 peticiones incluso si Goal API falla en todas sus páginas.
const MAX_PAGINAS_POR_COMPETICION = 8
const URL_GOAL_API = 'https://goal-api.com/documentation'
const URL_DIMAYOR = (anio: number) => `https://dimayor.com.co/programaciones-competencias-dimayor-${anio}/`

export interface FilaCalendarioColombiano {
  competition_slug: string
  season: string
  provider: 'goal-api'
  provider_fixture_id: string
  round_name: string
  scheduled_at: string
  home_team: string
  away_team: string
  status: PartidoFutbolProveedor['estado']
  goals_home: number | null
  goals_away: number | null
  venue: string | null
  city: string | null
  source_name: 'Goal API'
  source_url: string
  official_source_url: string
  checked_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

export interface RepositorioCalendarioColombiano {
  upsertCalendario(filas: FilaCalendarioColombiano[]): Promise<void>
}

export interface ResultadoCalendarioColombiano {
  estado: 'completado' | 'parcial' | 'sin_datos' | 'fallido'
  solicitudes: number
  fixturesRecibidos: number
  fixturesGuardados: number
  competicionesProcesadas: number
  errorCode?: 'PROVEEDOR_NO_DISPONIBLE' | 'PAGINACION_INVALIDA' | 'LIMITE_PAGINAS' | 'SIN_CALENDARIO'
}

/**
 * Sincroniza el calendario A/B/Copa en serie. Conserva la identidad del proveedor
 * aunque cambie fecha/ronda, y pagina con un techo diario explícito de 120
 * peticiones para no comerse la cuota reservada al marcador en vivo.
 */
export async function sincronizarCalendarioColombiano(input: {
  proveedor: ProveedorFutbol
  repositorio: RepositorioCalendarioColombiano
  fechaNegocio: string
  derechosPublicacionConfirmados: boolean
  ahora?: () => Date
}): Promise<ResultadoCalendarioColombiano> {
  const obtenerPagina = input.proveedor.obtenerFixturesLiga
  if (input.proveedor.id !== 'goal-api' || typeof obtenerPagina !== 'function') {
    return {
      estado: 'fallido', solicitudes: 0, fixturesRecibidos: 0,
      fixturesGuardados: 0, competicionesProcesadas: 0,
      errorCode: 'PROVEEDOR_NO_DISPONIBLE'
    }
  }

  const anioBase = Number(input.fechaNegocio.slice(0, 4))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fechaNegocio) || !Number.isInteger(anioBase)) {
    return {
      estado: 'fallido', solicitudes: 0, fixturesRecibidos: 0,
      fixturesGuardados: 0, competicionesProcesadas: 0,
      errorCode: 'SIN_CALENDARIO'
    }
  }

  const consultadoEn = (input.ahora || (() => new Date()))().toISOString()
  const filas = new Map<string, FilaCalendarioColombiano>()
  let solicitudes = 0
  let fixturesRecibidos = 0
  let competicionesProcesadas = 0
  let errores = 0
  let primerError: ResultadoCalendarioColombiano['errorCode']

  for (const liga of LIGAS_CALENDARIO_COLOMBIANO_GOAL) {
    const filasLiga = new Map<string, FilaCalendarioColombiano>()
    let offset = 0
    const offsetsVistos = new Set<number>()
    let pagina = 0
    let kickoffMasAntiguoAnterior: number | undefined

    try {
      while (true) {
        pagina += 1
        const respuesta = await obtenerPagina.call(input.proveedor, liga.id, TAMANO_PAGINA, offset)
        solicitudes += respuesta.solicitudes ?? 1
        fixturesRecibidos += respuesta.elementos.length

        for (const partido of respuesta.elementos) {
          const fila = mapearFixture(partido, liga.competencia, anioBase, consultadoEn, input.derechosPublicacionConfirmados)
          if (fila) filasLiga.set(fila.provider_fixture_id, fila)
        }

        // El endpoint observado pagina desde los calendarios más recientes.
        // Solo dejamos de recorrer temporadas viejas cuando también se confirma
        // que la página completa precede a la anterior; si cambia el orden,
        // permanece el tope de páginas y la corrida falla de forma cerrada.
        const kickoffsPagina = respuesta.elementos.map(partido => Date.parse(partido.inicioUtc))
          .filter(Number.isFinite)
        const paginaAnteriorAlAnio = kickoffsPagina.length > 0
          && kickoffsPagina.every(instante => new Date(instante).getUTCFullYear() < anioBase)
          && kickoffMasAntiguoAnterior !== undefined
          && Math.max(...kickoffsPagina) < kickoffMasAntiguoAnterior
        if (paginaAnteriorAlAnio) break
        if (kickoffsPagina.length) kickoffMasAntiguoAnterior = Math.min(...kickoffsPagina)

        if (!respuesta.siguienteCursor) break
        const siguiente = Number(respuesta.siguienteCursor)
        if (!Number.isInteger(siguiente) || siguiente <= offset || offsetsVistos.has(siguiente)) {
          throw new Error('PAGINACION_INVALIDA')
        }
        if (pagina >= MAX_PAGINAS_POR_COMPETICION) throw new Error('LIMITE_PAGINAS')
        offsetsVistos.add(siguiente)
        offset = siguiente
      }

      competicionesProcesadas += 1
      for (const [id, fila] of filasLiga) filas.set(`${fila.competition_slug}:${fila.season}:${id}`, fila)
    } catch (error) {
      errores += 1
      primerError ||= leerErrorSeguro(error)
      solicitudes += leerSolicitudesConsumidas(error)
    }
  }

  if (filas.size) {
    try {
      await input.repositorio.upsertCalendario([...filas.values()])
    } catch {
      return {
        estado: 'fallido', solicitudes, fixturesRecibidos, fixturesGuardados: 0,
        competicionesProcesadas, errorCode: 'SIN_CALENDARIO'
      }
    }
  }

  if (!filas.size) {
    return {
      estado: 'sin_datos', solicitudes, fixturesRecibidos, fixturesGuardados: 0,
      competicionesProcesadas, errorCode: primerError || 'SIN_CALENDARIO'
    }
  }

  return {
    estado: errores ? 'parcial' : 'completado', solicitudes,
    fixturesRecibidos, fixturesGuardados: filas.size, competicionesProcesadas,
    ...(errores ? { errorCode: primerError || 'PROVEEDOR_NO_DISPONIBLE' } : {})
  }
}

function mapearFixture(
  partido: PartidoFutbolProveedor,
  competencia: typeof LIGAS_CALENDARIO_COLOMBIANO_GOAL[number]['competencia'],
  anioBase: number,
  checkedAt: string,
  derechosConfirmados: boolean
): FilaCalendarioColombiano | null {
  const instante = Date.parse(partido.inicioUtc)
  if (!Number.isFinite(instante)) return null
  const fecha = new Date(instante)
  const anio = fecha.getUTCFullYear()
  if (anio < anioBase || anio > anioBase + 1) return null

  const id = partido.idProveedor.trim()
  const local = partido.local.nombre.trim().slice(0, 120)
  const visitante = partido.visitante.nombre.trim().slice(0, 120)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 120
    || local.length < 2 || visitante.length < 2 || normalizarEquipo(local) === normalizarEquipo(visitante)) {
    return null
  }

  const temporada = resolverTemporada(partido, fecha)
  const anioTemporada = Number(temporada.slice(0, 4))
  if (anioTemporada < anioBase || anioTemporada > anioBase + 1) return null
  const jornada = (partido.competencia.jornada || partido.competencia.etapa || partido.competencia.grupo || 'Por confirmar')
    .trim().slice(0, 120) || 'Por confirmar'
  const officialSourceUrl = URL_DIMAYOR(anioTemporada)

  return {
    competition_slug: competencia,
    season: temporada,
    provider: 'goal-api',
    provider_fixture_id: id,
    round_name: jornada,
    scheduled_at: fecha.toISOString(),
    home_team: local,
    away_team: visitante,
    status: partido.estado,
    goals_home: normalizarMarcador(partido.golesLocal),
    goals_away: normalizarMarcador(partido.golesVisitante),
    venue: limpiarTexto(partido.sede, 160),
    city: limpiarTexto(partido.ciudad, 120),
    source_name: 'Goal API',
    source_url: URL_GOAL_API,
    official_source_url: officialSourceUrl,
    checked_at: checkedAt,
    is_public: derechosConfirmados,
    publication_rights_confirmed: derechosConfirmados
  }
}

function resolverTemporada(partido: PartidoFutbolProveedor, fecha: Date): string {
  const texto = [partido.competencia.temporada, partido.competencia.etapa]
    .filter(valor => valor !== undefined && valor !== null)
    .join(' ')
    .toLocaleLowerCase('es-CO')
  const anioTexto = /(?:^|\D)(20\d{2})(?:\D|$)/.exec(texto)?.[1]
  const anio = anioTexto ? Number(anioTexto) : fecha.getUTCFullYear()
  const fase = /clausura|finalizaci[oó]n|\bii\b|segundo/.test(texto) ? 'II'
    : /apertura|\bi\b|primer/.test(texto) ? 'I'
      : fecha.getUTCMonth() >= 6 ? 'II' : 'I'
  return `${anio}-${fase}`
}

function normalizarMarcador(valor: number | null): number | null {
  return Number.isInteger(valor) && valor! >= 0 && valor! <= 99 ? valor : null
}

function limpiarTexto(valor: string | undefined, limite: number): string | null {
  const texto = valor?.trim().slice(0, limite)
  return texto || null
}

function normalizarEquipo(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').trim()
}

function leerSolicitudesConsumidas(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const valor = (error as { solicitudesConsumidas?: unknown }).solicitudesConsumidas
  return Number.isInteger(valor) && typeof valor === 'number' && valor >= 0 ? valor : 0
}

function leerErrorSeguro(error: unknown): ResultadoCalendarioColombiano['errorCode'] {
  if (!(error instanceof Error)) return 'PROVEEDOR_NO_DISPONIBLE'
  if (error.message === 'PAGINACION_INVALIDA') return 'PAGINACION_INVALIDA'
  if (error.message === 'LIMITE_PAGINAS') return 'LIMITE_PAGINAS'
  return 'PROVEEDOR_NO_DISPONIBLE'
}
