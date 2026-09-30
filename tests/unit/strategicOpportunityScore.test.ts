import { describe, expect, it } from 'vitest'
import { calcularStrategicOpportunityScore } from '~/server/utils/strategicOpportunityScore'

const señales = {
  recency: 95, relevance: 20, novelty: 20, editorialFit: 20,
  searchDemand: 5, lifespan: 5, socialPotential: 10,
  interactivePotential: 0, firstPartyData: 0, competitionOpportunity: 0
}

describe('Strategic Opportunity Score', () => {
  it('no eleva una oportunidad sólo por su recencia', () => {
    expect(calcularStrategicOpportunityScore(señales, 'breaking')).toBeLessThan(45)
  })

  it('prioriza un explicador con demanda y vida útil verificadas', () => {
    const explicador = {
      ...señales, recency: 20, relevance: 85, editorialFit: 80,
      searchDemand: 95, lifespan: 95, competitionOpportunity: 70
    }
    expect(calcularStrategicOpportunityScore(explicador, 'explainer'))
      .toBeGreaterThan(calcularStrategicOpportunityScore(señales, 'breaking'))
  })
})
