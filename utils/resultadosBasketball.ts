import type {
  EstadisticaEquipoApiBasketball,
  PartidoApiBasketball,
  PosicionApiBasketball
} from '~/types/apiBasketball'
import type {
  EstadoPartido,
  EstadisticaPartido,
  PartidoResultado,
  PosicionClasificacion
} from '~/types/resultados'
import { crearNombreCorto } from '~/utils/resultadosDeportivos'

const estadosEnVivo = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT', 'HT'])
const estadosFinalizados = new Set(['FT', 'AOT', 'AWD'])

export function obtenerEstadoBasketball(codigo: string): EstadoPartido {
  if (estadosEnVivo.has(codigo)) return 'en-vivo'
  if (estadosFinalizados.has(codigo)) return 'finalizado'
  return 'programado'
}

export function mapearPartidoApiBasketball(partido: PartidoApiBasketball): PartidoResultado {
  const estado = obtenerEstadoBasketball(partido.status.short)

  return {
    id: `basket-${partido.id}`,
    deporte: 'baloncesto',
    competencia: partido.league.name,
    paisCompetencia: partido.country?.name,
    jornada: partido.week || partido.stage || undefined,
    temporada: partido.league.season,
    fechaIso: partido.date,
    estado,
    periodo: estado === 'en-vivo' ? traducirPeriodo(partido.status.short, partido.status.timer) : undefined,
    equipoLocal: mapearEquipo(partido.teams.home),
    equipoVisitante: mapearEquipo(partido.teams.away),
    marcadorLocal: convertirNumero(partido.scores.home.total),
    marcadorVisitante: convertirNumero(partido.scores.away.total),
    estadio: partido.venue || undefined,
    destacado: esPartidoDestacado(partido)
  }
}

export function mapearEstadisticasApiBasketball(
  partido: PartidoApiBasketball,
  estadisticasEquipos: EstadisticaEquipoApiBasketball[]
): EstadisticaPartido[] {
  const estadisticasPeriodos = [
    crearEstadisticaPeriodo('primer-cuarto', 'Primer cuarto', partido.scores.home.quarter_1, partido.scores.away.quarter_1),
    crearEstadisticaPeriodo('segundo-cuarto', 'Segundo cuarto', partido.scores.home.quarter_2, partido.scores.away.quarter_2),
    crearEstadisticaPeriodo('tercer-cuarto', 'Tercer cuarto', partido.scores.home.quarter_3, partido.scores.away.quarter_3),
    crearEstadisticaPeriodo('cuarto-cuarto', 'Cuarto cuarto', partido.scores.home.quarter_4, partido.scores.away.quarter_4),
    crearEstadisticaPeriodo('tiempo-extra', 'Tiempo extra', partido.scores.home.over_time, partido.scores.away.over_time)
  ].filter((estadistica): estadistica is EstadisticaPartido => Boolean(estadistica))

  const local = estadisticasEquipos.find(item => item.team.id === partido.teams.home.id)
  const visitante = estadisticasEquipos.find(item => item.team.id === partido.teams.away.id)
  if (!local || !visitante) return estadisticasPeriodos

  return [
    ...estadisticasPeriodos,
    crearEstadistica('rebotes', 'Rebotes', local.rebounds?.total, visitante.rebounds?.total),
    crearEstadistica('asistencias', 'Asistencias', local.assists, visitante.assists),
    crearEstadistica('robos', 'Robos', local.steals, visitante.steals),
    crearEstadistica('bloqueos', 'Bloqueos', local.blocks, visitante.blocks),
    crearEstadistica('perdidas', 'Pérdidas', local.turnovers, visitante.turnovers),
    crearEstadistica('faltas-personales', 'Faltas personales', local.personal_fouls, visitante.personal_fouls),
    crearEstadistica(
      'porcentaje-campo',
      'Efectividad de campo',
      local.field_goals?.percentage,
      visitante.field_goals?.percentage,
      '%'
    ),
    crearEstadistica(
      'porcentaje-triples',
      'Efectividad en triples',
      local.threepoint_goals?.percentage,
      visitante.threepoint_goals?.percentage,
      '%'
    )
  ]
}

export function mapearClasificacionApiBasketball(
  posiciones: PosicionApiBasketball[]
): PosicionClasificacion[] {
  return posiciones.slice(0, 10).map((fila) => {
    const puntosFavor = convertirNumero(fila.points?.for) || 0
    const puntosContra = convertirNumero(fila.points?.against) || 0
    const ganados = convertirNumero(fila.games?.win?.total) || 0

    return {
      posicion: fila.position,
      equipo: mapearEquipo(fila.team),
      jugados: convertirNumero(fila.games?.played) || 0,
      ganados,
      empatados: 0,
      perdidos: convertirNumero(fila.games?.lose?.total) || 0,
      diferencia: puntosFavor - puntosContra,
      puntos: convertirNumero(fila.group?.points) ?? ganados
    }
  })
}

function mapearEquipo(equipo: PartidoApiBasketball['teams']['home']) {
  return {
    id: String(equipo.id),
    nombre: equipo.name,
    nombreCorto: crearNombreCorto(equipo.name),
    logo: equipo.logo || undefined
  }
}

function crearEstadistica(
  clave: string,
  etiqueta: string,
  local?: number | null,
  visitante?: number | null,
  sufijo?: string
): EstadisticaPartido {
  return {
    clave,
    etiqueta,
    local: convertirNumero(local) || 0,
    visitante: convertirNumero(visitante) || 0,
    sufijo
  }
}

function crearEstadisticaPeriodo(
  clave: string,
  etiqueta: string,
  local?: number | null,
  visitante?: number | null
): EstadisticaPartido | undefined {
  if (local === null || local === undefined || visitante === null || visitante === undefined) return undefined
  return crearEstadistica(clave, etiqueta, local, visitante)
}

function traducirPeriodo(codigo: string, reloj?: string | null): string {
  const periodos: Record<string, string> = {
    Q1: 'Primer cuarto',
    Q2: 'Segundo cuarto',
    Q3: 'Tercer cuarto',
    Q4: 'Cuarto cuarto',
    OT: 'Tiempo extra',
    BT: 'Descanso',
    HT: 'Medio tiempo'
  }
  const periodo = periodos[codigo] || 'En vivo'
  return reloj ? `${periodo} · ${reloj}` : periodo
}

function convertirNumero(valor?: string | number | null): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : undefined
}

function esPartidoDestacado(partido: PartidoApiBasketball): boolean {
  const competencia = partido.league.name.toLocaleLowerCase('es')
  const pais = partido.country?.name?.toLocaleLowerCase('es') || ''
  return competencia.includes('nba')
    || competencia.includes('euroleague')
    || competencia.includes('world')
    || competencia.includes('fiba')
    || pais === 'colombia'
}
