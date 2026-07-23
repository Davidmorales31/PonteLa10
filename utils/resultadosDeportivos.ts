import type { EstadoPartido, FixtureApiFootball, PartidoResultado } from '~/types/resultados'

const estadosEnVivo = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'])
const estadosFinalizados = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO'])

export function obtenerEstadoPartidoApi(codigo: string): EstadoPartido {
  if (estadosEnVivo.has(codigo)) {
    return 'en-vivo'
  }

  if (estadosFinalizados.has(codigo)) {
    return 'finalizado'
  }

  return 'programado'
}

export function mapearFixtureApiFootball(fixture: FixtureApiFootball): PartidoResultado {
  const estado = obtenerEstadoPartidoApi(fixture.fixture.status.short)

  return {
    id: String(fixture.fixture.id),
    deporte: 'futbol',
    competencia: fixture.league.name,
    paisCompetencia: fixture.league.country,
    jornada: fixture.league.round,
    temporada: fixture.league.season,
    fechaIso: fixture.fixture.date,
    estado,
    minuto: estado === 'en-vivo' ? fixture.fixture.status.elapsed ?? undefined : undefined,
    equipoLocal: {
      id: String(fixture.teams.home.id),
      nombre: fixture.teams.home.name,
      nombreCorto: crearNombreCorto(fixture.teams.home.name),
      logo: fixture.teams.home.logo
    },
    equipoVisitante: {
      id: String(fixture.teams.away.id),
      nombre: fixture.teams.away.name,
      nombreCorto: crearNombreCorto(fixture.teams.away.name),
      logo: fixture.teams.away.logo
    },
    marcadorLocal: fixture.goals.home ?? undefined,
    marcadorVisitante: fixture.goals.away ?? undefined,
    estadio: fixture.fixture.venue?.name ?? undefined,
    ciudad: fixture.fixture.venue?.city ?? undefined,
    destacado: esPartidoDestacado(fixture)
  }
}

export function ordenarPartidosRelevantes(partidos: PartidoResultado[]): PartidoResultado[] {
  return [...partidos].sort((primero, segundo) => {
    const prioridadEstado = { 'en-vivo': 0, finalizado: 1, programado: 2 }
    const diferenciaEstado = prioridadEstado[primero.estado] - prioridadEstado[segundo.estado]
    const diferenciaDestacado = Number(Boolean(segundo.destacado)) - Number(Boolean(primero.destacado))

    return diferenciaEstado || diferenciaDestacado || Date.parse(segundo.fechaIso) - Date.parse(primero.fechaIso)
  })
}

export function obtenerEtiquetaEstado(partido: PartidoResultado): string {
  if (partido.estado === 'en-vivo') {
    return partido.minuto ? `${partido.minuto}′` : partido.periodo || 'En vivo'
  }

  if (partido.estado === 'finalizado') {
    return 'Finalizado'
  }

  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota'
  }).format(new Date(partido.fechaIso))
}

export function crearNombreCorto(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 1) {
    return palabras[0]!.slice(0, 3).toUpperCase()
  }

  return palabras.slice(0, 3).map(palabra => palabra[0]).join('').toUpperCase()
}

function esPartidoDestacado(fixture: FixtureApiFootball): boolean {
  const pais = fixture.league.country?.toLocaleLowerCase('es') || ''
  const competencia = fixture.league.name.toLocaleLowerCase('es')
  return pais === 'colombia' || competencia.includes('world cup') || competencia.includes('champions')
}
