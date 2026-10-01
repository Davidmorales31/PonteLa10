import type { DetallePartidoResultado, EstadisticaPartido, EventoPartido, PartidoResultado } from '~/types/resultados'
import type { FixtureFutbolPublico } from '~/types/futbolPublico'
import { crearNombreCorto } from '~/utils/resultadosDeportivos'

export function mapearFixtureFutbolAResultado(fixture: FixtureFutbolPublico): PartidoResultado {
  const estado = fixture.status === 'live' || fixture.status === 'halftime'
    ? 'en-vivo'
    : fixture.status === 'finished'
      ? 'finalizado'
      : 'programado'

  return {
    id: fixture.id,
    deporte: 'futbol',
    competencia: fixture.competition.name,
    ...(fixture.competition.country ? { paisCompetencia: fixture.competition.country } : {}),
    ...(fixture.competition.round ? { jornada: fixture.competition.round } : {}),
    temporada: fixture.competition.season,
    fechaIso: fixture.kickoffAt,
    estado,
    ...(fixture.elapsed !== null ? { minuto: fixture.elapsed } : {}),
    equipoLocal: { id: 'local', nombre: fixture.homeTeam.name, nombreCorto: crearNombreCorto(fixture.homeTeam.name) },
    equipoVisitante: { id: 'visitante', nombre: fixture.awayTeam.name, nombreCorto: crearNombreCorto(fixture.awayTeam.name) },
    ...(fixture.goalsHome !== null ? { marcadorLocal: fixture.goalsHome } : {}),
    ...(fixture.goalsAway !== null ? { marcadorVisitante: fixture.goalsAway } : {}),
    ...(fixture.venue.name ? { estadio: fixture.venue.name } : {}),
    ...(fixture.venue.city ? { ciudad: fixture.venue.city } : {})
  }
}

export function mapearDetalleFutbolPublico(fixture: FixtureFutbolPublico): DetallePartidoResultado {
  const partido = mapearFixtureFutbolAResultado(fixture)
  const eventos: EventoPartido[] = fixture.events.flatMap((evento, indice) => {
    const tipos: Record<string, EventoPartido['tipo'] | null> = {
      goal: 'gol',
      penalty: 'gol',
      'own-goal': 'gol',
      substitution: 'cambio',
      'yellow-card': 'tarjeta-amarilla',
      'red-card': 'tarjeta-roja',
      var: null,
      other: null
    }
    const tipo = tipos[evento.tipo]
    if (!tipo || evento.lado === 'desconocido') return []
    return [{
      id: `snapshot-evento-${indice}`,
      minuto: evento.minutoTexto || (evento.minuto === null ? '—' : `${evento.minuto}′`),
      tipo,
      equipoId: evento.lado,
      jugador: evento.jugador || 'Sin jugador identificado',
      ...(evento.jugadorRelacionado ? { detalle: `Asistencia: ${evento.jugadorRelacionado}` }
        : evento.descripcion ? { detalle: evento.descripcion } : {})
    }]
  })
  const alineaciones = fixture.lineups.map(alineacion => ({
    equipoId: alineacion.lado,
    formacion: alineacion.formacion || 'Formación no informada',
    entrenador: alineacion.entrenador || 'Entrenador no informado',
    titulares: alineacion.jugadores
      .filter(jugador => jugador.titular)
      .map(jugador => jugador.numero ? `${jugador.numero}. ${jugador.nombre}` : jugador.nombre)
  }))
  const estadisticas: EstadisticaPartido[] = fixture.statistics.map((estadistica) => {
    const local = convertirEstadistica(estadistica.local)
    const visitante = convertirEstadistica(estadistica.visitante)
    return {
      clave: estadistica.clave,
      etiqueta: estadistica.etiqueta,
      local: local.valor,
      visitante: visitante.valor,
      ...(local.porcentaje || visitante.porcentaje || estadistica.unidad === '%' ? { sufijo: '%' } : {})
    }
  })

  return {
    partido,
    eventos,
    alineaciones,
    estadisticas,
    clasificacion: [],
    actualizadoEn: fixture.providerFetchedAt,
    origen: 'base-datos'
  }
}

function convertirEstadistica(valor: number | string | null): { valor: number; porcentaje: boolean } {
  if (typeof valor === 'number' && Number.isFinite(valor)) return { valor, porcentaje: false }
  if (typeof valor !== 'string') return { valor: 0, porcentaje: false }
  const texto = valor.trim()
  const porcentaje = texto.endsWith('%')
  const numero = Number(texto.replace('%', '').replace(',', '.'))
  return { valor: Number.isFinite(numero) ? numero : 0, porcentaje }
}
