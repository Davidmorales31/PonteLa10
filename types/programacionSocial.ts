import type { DestinoMeta, ResultadoPublicacionMeta } from './publicacionMeta'
export interface ColaProgramacionSocial {
  activo: boolean
  ultimoLatido: string | null
  lotes: { id: string, starts_at: string, interval_minutes: number, created_at: string }[]
  trabajos: { id: string, loteId: string, articuloId: string, posicion: number, fecha: string, estado: string,
    destinos: string[], titulo: string, resultado: { redes?: Partial<Record<DestinoMeta, ResultadoPublicacionMeta>>, aviso?: string } | null }[]
}
