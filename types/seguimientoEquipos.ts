export interface PartidoEquipoSeguidoResumen {
  slug: string
  local: string
  visitante: string
  fechaIso: string
  competencia: string
  golesLocal: number | null
  golesVisitante: number | null
}

export interface NoticiaEquipoSeguidoResumen {
  slug: string
  titulo: string
  publicadoEn: string
}

export interface EquipoSeguidoResumen {
  slug: string
  nombre: string
  escudo: string | null
  competencia: string | null
  temporada: string | null
  posicion: number | null
  puntos: number | null
  partidoEnVivo: PartidoEquipoSeguidoResumen | null
  proximoPartido: PartidoEquipoSeguidoResumen | null
  noticia: NoticiaEquipoSeguidoResumen | null
}
