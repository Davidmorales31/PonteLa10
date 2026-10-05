export interface PartidoParaSchemaSeo {
  local: string
  visitante: string
  fechaIso: string
  verificadoEn?: string
  estado: string | null
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  urlCanonica: string
  descripcion: string
}

const UMBRAL_ESTADO_EN_VIVO_MS = 3 * 60 * 1000

export function normalizarEstadoSeoPartido(
  estado: string | null,
  fechaIso: string,
  verificadoEn?: string,
  ahora = Date.now()
): string | null {
  const inicio = Date.parse(fechaIso)
  if (!estado) return Number.isFinite(inicio) && inicio < ahora ? 'actualizacion_pendiente' : estado
  const estadoNormalizado = estado.trim().toLocaleLowerCase('es-CO').replace(/[ -]+/g, '_')
  const sigueProgramado = ['scheduled', 'not_started', 'not_started_yet', 'fixture', 'ns', 'pending'].includes(estadoNormalizado)
  const pareceEnVivo = /live|progress|halftime|in_play|inplay|1h|2h|extra_time|penalt|playing|en_vivo/.test(estadoNormalizado)
  if (sigueProgramado && Number.isFinite(inicio) && inicio < ahora) return 'actualizacion_pendiente'
  if (['unknown', 'not_available', 'n_a', 'abandoned', 'aborted'].includes(estadoNormalizado)) {
    return estadoNormalizado === 'abandoned' || estadoNormalizado === 'aborted' ? 'abandoned' : 'actualizacion_pendiente'
  }

  if (pareceEnVivo) {
    const verificacion = Date.parse(verificadoEn || '')
    const verificacionVigente = Number.isFinite(verificacion)
      && verificacion <= ahora + 30_000
      && ahora - verificacion <= UMBRAL_ESTADO_EN_VIVO_MS
    if (!verificacionVigente) return 'actualizacion_pendiente'
  }

  return estado
}

export function etiquetaEstadoSeoPartido(estado: string | null): string {
  const normalizado = (estado || '').trim().toLocaleLowerCase('es-CO')
  if (/cancel|anulad/.test(normalizado)) return 'CANCELADO'
  if (/abandon|abort/.test(normalizado)) return 'ABANDONADO'
  if (/suspend/.test(normalizado)) return 'SUSPENDIDO'
  if (/postpon|aplaz/.test(normalizado)) return 'APLAZADO'
  if (/reprogram/.test(normalizado)) return 'REPROGRAMADO'
  if (/actualizacion_pendiente|refresh_pending|update_pending/.test(normalizado)) return 'ACTUALIZACIÓN PENDIENTE'
  if (/live|progress|halftime|in_play|inplay|1h|2h|extra_time|penalt|playing|en-vivo|en_vivo/.test(normalizado)) return 'EN VIVO'
  if (/finish|full.?time|\bft\b|final/.test(normalizado)) return 'FINALIZADO'
  return 'PROGRAMADO'
}

/**
 * Devuelve SportsEvent solo cuando la ficha pública tiene ubicación verificable.
 * Sin ubicación no se emite el rich result de evento incompleto.
 */
export function construirSportsEventSeo(partido: PartidoParaSchemaSeo): Record<string, unknown> | null {
  if (!partido.estadio?.trim() || !Number.isFinite(Date.parse(partido.fechaIso))) return null

  const estado = (normalizarEstadoSeoPartido(partido.estado, partido.fechaIso, partido.verificadoEn) || '').toLocaleLowerCase('es-CO')
  if (/actualizacion_pendiente|refresh_pending|update_pending/.test(estado)) return null
  const eventStatus = /cancel|anulad|abandon|abort/.test(estado)
    ? 'https://schema.org/EventCancelled'
    : /postpon|aplaz|suspend|reprogram/.test(estado)
      ? 'https://schema.org/EventPostponed'
      : /live|progress|halftime|en-vivo/.test(estado)
        ? 'https://schema.org/EventInProgress'
        : /finish|full.?time|\bft\b|final/.test(estado)
          ? 'https://schema.org/EventCompleted'
          : 'https://schema.org/EventScheduled'

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${partido.local} vs ${partido.visitante}`,
    sport: 'Soccer',
    startDate: partido.fechaIso,
    eventStatus,
    homeTeam: { '@type': 'SportsTeam', name: partido.local },
    awayTeam: { '@type': 'SportsTeam', name: partido.visitante },
    ...(partido.golesLocal !== null && partido.golesVisitante !== null
      ? { homeTeamScore: String(partido.golesLocal), awayTeamScore: String(partido.golesVisitante) }
      : {}),
    location: {
      '@type': 'Place',
      name: partido.estadio.trim(),
      ...(partido.ciudad?.trim()
        ? { address: { '@type': 'PostalAddress', addressLocality: partido.ciudad.trim(), addressCountry: 'CO' } }
        : {})
    },
    url: partido.urlCanonica,
    description: partido.descripcion
  }
}
