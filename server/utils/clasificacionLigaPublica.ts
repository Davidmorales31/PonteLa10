import { normalizarClaveEquipoLiga } from '~/server/utils/partidosSeoPublicos'

export interface FilaClasificacionLigaBase {
  competition_slug: string
  season: string
  phase: string
  team_key: string
  team_name: string
  team_logo_url: string | null
  is_public: boolean
  publication_rights_confirmed: boolean
}

export interface SnapshotClasificacionLigaPrivada {
  provider: string
  league_name: string
  season: string
  standings: {
    grupos: Array<{
      nombre: string
      etapa: string | null
      filas: Array<{
        posicion: number
        equipo: { nombre: string }
        jugados: number
        ganados: number
        empatados: number
        perdidos: number
        golesFavor: number
        golesContra: number
        diferenciaGoles: number
        puntos: number
      }>
    }>
  }
  provider_fetched_at: string
}

export interface FilaClasificacionLigaParaPublicar extends FilaClasificacionLigaBase {
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  source_name: string
  source_url: string
  checked_at: string
}

/** Reutiliza los derechos del registro público existente y no descubre equipos nuevos. */
export function proyectarClasificacionLigaPublica(
  snapshots: SnapshotClasificacionLigaPrivada[],
  filasBase: FilaClasificacionLigaBase[],
  fechaNegocio: string
): FilaClasificacionLigaParaPublicar[] {
  const basesAutorizadas = filasBase.filter(fila => fila.is_public && fila.publication_rights_confirmed)
  const salida = new Map<string, FilaClasificacionLigaParaPublicar>()
  const anioNegocio = Number(fechaNegocio.slice(0, 4))

  for (const snapshot of snapshots) {
    const competencia = competenciaLiga(snapshot.league_name)
    if (!competencia || !Number.isFinite(Date.parse(snapshot.provider_fetched_at))) continue
    const temporadas = [...new Set(basesAutorizadas
      .filter(fila => fila.competition_slug === competencia && coincideTemporada(fila.season, snapshot.season, anioNegocio))
      .map(fila => fila.season))]
    if (temporadas.length !== 1) continue
    const temporada = temporadas[0]!
    const basesTemporada = basesAutorizadas.filter(fila => fila.competition_slug === competencia && fila.season === temporada)

    for (const grupo of snapshot.standings?.grupos || []) {
      if (!Array.isArray(grupo.filas) || !grupo.filas.length) continue
      const fase = normalizarFase(grupo.nombre, grupo.etapa, basesTemporada)
      for (const posicion of grupo.filas) {
        if (!esFilaValida(posicion)) continue
        // Reutiliza el permiso de la fase exacta; no se hereda a cuadrangulares
        // u otra fase sin un registro público autorizado para esa misma fila.
        const base = basesTemporada.find(fila => fila.phase === fase
          && normalizarClaveEquipoLiga(fila.team_name) === normalizarClaveEquipoLiga(posicion.equipo.nombre))
        if (!base) continue

        const fila: FilaClasificacionLigaParaPublicar = {
          ...base,
          phase: fase,
          position: posicion.posicion,
          played: posicion.jugados,
          won: posicion.ganados,
          drawn: posicion.empatados,
          lost: posicion.perdidos,
          goals_for: posicion.golesFavor,
          goals_against: posicion.golesContra,
          goal_difference: posicion.diferenciaGoles,
          points: posicion.puntos,
          source_name: snapshot.provider === 'goal-api' ? 'Goal API' : 'API-Football',
          source_url: snapshot.provider === 'goal-api'
            ? 'https://api.goal-api.com/v1'
            : 'https://www.api-football.com/documentation-v3',
          checked_at: new Date(snapshot.provider_fetched_at).toISOString()
        }
        const clave = [fila.competition_slug, fila.season, fila.phase, fila.team_key].join('|')
        const actual = salida.get(clave)
        if (!actual || Date.parse(fila.checked_at) > Date.parse(actual.checked_at)) salida.set(clave, fila)
      }
    }
  }
  return [...salida.values()]
}

function competenciaLiga(nombre: string): string | null {
  const normalizado = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  if (/primera\s*a|first\s*division|liga\s*(betplay|dimayor)|division\s*profesional/.test(normalizado)) return 'liga-betplay'
  if (/primera\s*b|second\s*division|torneo\s*(betplay|dimayor)/.test(normalizado)) return 'torneo-betplay'
  return null
}

function coincideTemporada(publica: string, proveedor: string, anio: number): boolean {
  const anioProveedor = /20\d{2}/.exec(proveedor)?.[0]
  if (!anioProveedor || Number(anioProveedor) !== anio) return false
  const anioPublico = /20\d{2}/.exec(publica)?.[0]
  return Boolean(anioPublico && anioPublico === anioProveedor)
}

function normalizarFase(
  nombreGrupo: string,
  etapa: string | null,
  bases: FilaClasificacionLigaBase[]
): string {
  const nombre = normalizarTexto(nombreGrupo)
  const nombreEtapa = normalizarTexto(etapa || '')
  const proveedor = `${nombreEtapa} ${nombre}`
  if (/regular|todos contra todos|league stage|first phase|fase regular/.test(proveedor)) {
    const faseActual = bases.find(fila => /todos contra todos|fase regular|regular/i.test(fila.phase))?.phase
    return faseActual || 'Todos contra todos'
  }
  if (/cuadrang|play.?off|semifinal/.test(proveedor)) {
    const letra = /(?:grupo|group)\s*([a-z0-9]+)/i.exec(nombreGrupo)?.[1]
    return letra ? `Cuadrangulares · Grupo ${letra.toLocaleUpperCase('es-CO')}` : 'Cuadrangulares'
  }
  if (/final/.test(proveedor)) return 'Final'
  const fase = (etapa?.trim() || nombreGrupo.trim()).replace(/\s+/g, ' ').slice(0, 80)
  return fase.length >= 2 ? fase : 'Clasificación'
}

function normalizarTexto(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
}

function esFilaValida(fila: SnapshotClasificacionLigaPrivada['standings']['grupos'][number]['filas'][number]): boolean {
  const enteros = [fila.posicion, fila.jugados, fila.ganados, fila.empatados, fila.perdidos,
    fila.golesFavor, fila.golesContra, fila.diferenciaGoles, fila.puntos]
  return typeof fila.equipo?.nombre === 'string' && fila.equipo.nombre.trim().length >= 2
    && enteros.every(Number.isSafeInteger)
    && fila.posicion > 0 && fila.posicion <= 40
    && fila.jugados >= 0 && fila.jugados <= 50
    && fila.ganados >= 0 && fila.empatados >= 0 && fila.perdidos >= 0
    && fila.ganados + fila.empatados + fila.perdidos <= fila.jugados
    && fila.golesFavor >= 0 && fila.golesFavor <= 300
    && fila.golesContra >= 0 && fila.golesContra <= 300
    && fila.diferenciaGoles === fila.golesFavor - fila.golesContra
    && fila.puntos >= 0 && fila.puntos <= fila.jugados * 3 + 9
}
