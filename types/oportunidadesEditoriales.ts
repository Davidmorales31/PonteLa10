export type RecomendacionEditorialCodex = 'create' | 'update' | 'merge' | 'expand' | 'discard'

export interface ArticuloEditorialOportunidad {
  id: string
  slug: string
  title: string
}

export interface ArticuloPropuestoOportunidad extends ArticuloEditorialOportunidad {
  status: string
}

export interface OportunidadEditorialCodex {
  id: string
  categoryId: string
  categoryName: string
  fingerprint: string
  title: string
  term: string
  evaluacion: 'completa' | 'pendiente'
  recommendation: RecomendacionEditorialCodex | null
  priorityScore: number | null
  updateability: number | null
  cannibalizationRisk: 'none' | 'low' | 'medium' | 'high' | null
  targetUrl: string | null
  targetArticle: ArticuloEditorialOportunidad | null
  entityMatch: { type: string, slug: string, name: string } | null
  similarArticles: Array<Pick<ArticuloEditorialOportunidad, 'id' | 'slug' | 'title'>>
  noveltyRationale: string | null
  differentiator: string | null
  proposalArticle: ArticuloPropuestoOportunidad | null
  updatedAt: string
}

export interface RespuestaOportunidadesEditorialesCodex {
  corrida: { runDate: string, status: string, updatedAt: string } | null
  oportunidades: OportunidadEditorialCodex[]
  candidatasInvalidas: number
}
