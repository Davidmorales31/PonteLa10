export interface ScoresOportunidadEstrategica {
  recency: number
  relevance: number
  novelty: number
  editorialFit: number
  searchDemand: number
  lifespan: number
  socialPotential: number
  interactivePotential: number
  firstPartyData: number
  competitionOpportunity: number
}

export const VERSION_SCORE_ESTRATEGICO = 'v1'

const pesosBase = {
  recency: 0.05,
  relevance: 0.14,
  novelty: 0.06,
  editorialFit: 0.12,
  searchDemand: 0.20,
  lifespan: 0.16,
  socialPotential: 0.08,
  interactivePotential: 0.06,
  firstPartyData: 0.06,
  competitionOpportunity: 0.07
} as const

export function calcularStrategicOpportunityScore(
  scores: ScoresOportunidadEstrategica,
  contentIntent: string
): number {
  const pesos = { ...pesosBase }
  if (contentIntent === 'breaking') {
    pesos.recency = 0.16
    pesos.lifespan = 0.05
  }
  if (contentIntent === 'evergreen' || contentIntent === 'search_utility') {
    pesos.recency = 0.02
    pesos.searchDemand = 0.23
    pesos.lifespan = 0.20
  }
  const totalPesos = Object.values(pesos).reduce((total, peso) => total + peso, 0)
  const total = Object.entries(pesos).reduce((acumulado, [campo, peso]) => (
    acumulado + scores[campo as keyof ScoresOportunidadEstrategica] * peso
  ), 0)
  return Math.round(total / totalPesos)
}
