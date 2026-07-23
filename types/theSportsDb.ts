export interface EventoTheSportsDb {
  idEvent: string
  idAPIfootball?: string | null
  strSport?: string | null
  strTimestamp?: string | null
  dateEvent?: string | null
  strTime?: string | null
  strStatus?: string | null
  strProgress?: string | null
  strLeague?: string | null
  strSeason?: string | null
  intRound?: string | number | null
  strCountry?: string | null
  strHomeTeam?: string | null
  strAwayTeam?: string | null
  idHomeTeam?: string | null
  idAwayTeam?: string | null
  strHomeTeamBadge?: string | null
  strAwayTeamBadge?: string | null
  intHomeScore?: string | number | null
  intAwayScore?: string | number | null
  strVenue?: string | null
  strCity?: string | null
}

export interface EventoLineaTiempoTheSportsDb {
  idTimeline: string
  strTimeline?: string | null
  strTimelineDetail?: string | null
  intTime?: string | number | null
  idTeam?: string | null
  strPlayer?: string | null
  strAssist?: string | null
}

export interface EstadisticaTheSportsDb {
  idStatistic: string
  strStat?: string | null
  intHome?: string | number | null
  intAway?: string | number | null
}

export interface JugadorAlineacionTheSportsDb {
  idLineup: string
  idTeam?: string | null
  strTeam?: string | null
  strSubstitute?: string | null
  intSquadNumber?: string | number | null
  strPlayer?: string | null
}

export interface RespuestaEventosTheSportsDb {
  events?: EventoTheSportsDb[] | null
}

export interface RespuestaLineaTiempoTheSportsDb {
  timeline?: EventoLineaTiempoTheSportsDb[] | null
}

export interface RespuestaEstadisticasTheSportsDb {
  eventstats?: EstadisticaTheSportsDb[] | null
}

export interface RespuestaAlineacionesTheSportsDb {
  lineup?: JugadorAlineacionTheSportsDb[] | null
}
