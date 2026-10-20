/** IDs Goal API de las tres competencias colombianas que reciben cobertura. */
export const LIGAS_CALENDARIO_COLOMBIANO_GOAL = [
  { id: 'cmr77dvv600aprx06o7y7lnfu', competencia: 'liga-betplay' },
  { id: 'cmr77dvv600asrx06y051mw74', competencia: 'torneo-betplay' },
  { id: 'cmr77dvv600aqrx068v1tyhd0', competencia: 'copa-colombia' }
] as const

export const LIGAS_PRIORITARIAS_GOAL = LIGAS_CALENDARIO_COLOMBIANO_GOAL.map(liga => liga.id)
