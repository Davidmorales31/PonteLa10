export const catalogoCompeticionesPublicas = {
  'liga-betplay': { nombre: 'Liga BetPlay', tipo: 'liga' as const },
  'torneo-betplay': { nombre: 'Torneo BetPlay', tipo: 'liga' as const },
  'copa-colombia': { nombre: 'Copa Colombia', tipo: 'copa' as const }
}

export type SlugCompeticionPublica = keyof typeof catalogoCompeticionesPublicas
