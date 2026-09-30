import type { PartidoResultado } from '~/types/resultados'

export interface JugadorColombianoEuropa {
  slug: string
  nombre: string
  equipoIdInterno: string
  club: string
}

export interface RespuestaColombianosEuropa {
  disponible: boolean
  actualizadoEn: string
  jugadores: JugadorColombianoEuropa[]
}

export interface PartidoColombianoEuropa {
  jugador: JugadorColombianoEuropa
  partido: PartidoResultado
  rival: string
  clubLocal: boolean
  horaColombia: string
}

export interface FilaMembresiaColombianoEuropa {
  jugador: {
    slug: string
    nombre: string
    codigoPais: string | null
    deporte: string
    publico: boolean
    nacionalidadVerificadaEn: string | null
  }
  membresia: {
    equipoId: string
    desde: string | null
    hasta: string | null
    publico: boolean
  }
  equipo: {
    id: string
    slug: string
    nombre: string
    codigoPais: string | null
    deporte: string
    publico: boolean
  }
}
