export type DestinoMeta = 'facebook' | 'instagram'
export interface ConexionMeta {
  facebook: { preparada: boolean, nombre: string, aviso: string }
  instagram: { preparada: boolean, nombre: string, aviso: string }
}
export interface ResultadoPublicacionMeta {
  estado: 'published' | 'in_progress' | 'uncertain' | 'failed'
  url?: string
  yaPublicado?: boolean
  aviso?: string
}
