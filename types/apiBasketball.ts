export interface EquipoApiBasketball {
  id: number
  name: string
  logo?: string | null
}

export interface MarcadorEquipoApiBasketball {
  quarter_1?: number | null
  quarter_2?: number | null
  quarter_3?: number | null
  quarter_4?: number | null
  over_time?: number | null
  total?: number | null
}

export interface PartidoApiBasketball {
  id: number
  date: string
  time?: string
  timestamp?: number
  timezone?: string
  stage?: string | null
  week?: string | null
  venue?: string | null
  status: {
    long?: string
    short: string
    timer?: string | null
  }
  league: {
    id: number
    name: string
    type?: string
    season: string | number
    logo?: string | null
  }
  country?: {
    id?: number
    name?: string
    code?: string
    flag?: string | null
  }
  teams: {
    home: EquipoApiBasketball
    away: EquipoApiBasketball
  }
  scores: {
    home: MarcadorEquipoApiBasketball
    away: MarcadorEquipoApiBasketball
  }
}

export interface EstadisticaEquipoApiBasketball {
  game: { id: number }
  team: { id: number }
  field_goals?: EstadisticaTirosApiBasketball
  threepoint_goals?: EstadisticaTirosApiBasketball
  freethrows_goals?: EstadisticaTirosApiBasketball
  rebounds?: {
    total?: number | null
    offence?: number | null
    defense?: number | null
  }
  assists?: number | null
  steals?: number | null
  blocks?: number | null
  turnovers?: number | null
  personal_fouls?: number | null
}

export interface EstadisticaTirosApiBasketball {
  total?: number | null
  attempts?: number | null
  percentage?: number | null
}

export interface PosicionApiBasketball {
  position: number
  stage?: string
  group?: { name?: string; points?: string | number | null }
  team: EquipoApiBasketball
  league?: { id?: number; name?: string; season?: string | number }
  country?: { name?: string }
  games?: {
    played?: number
    win?: { total?: number; percentage?: string }
    lose?: { total?: number; percentage?: string }
  }
  points?: {
    for?: number
    against?: number
  }
}

export interface RespuestaApiBasketball<T> {
  response: T[]
  errors?: Record<string, string>
  results?: number
}
