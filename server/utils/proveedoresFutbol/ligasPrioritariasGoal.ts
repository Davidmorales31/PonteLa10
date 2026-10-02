/**
 * IDs estables de GOAL API para el calendario de respaldo, verificados contra
 * GET /leagues. La consulta por leagueId evita depender de la primera página
 * mundial y no vuelve a descubrir estos IDs en cada corrida.
 */
export const LIGAS_PRIORITARIAS_GOAL = [
  // Colombia
  'cmr77dvv600aprx06o7y7lnfu', // Primera A
  'cmr77dvv600asrx06y051mw74', // Primera B
  'cmr77dvv600aqrx068v1tyhd0', // Copa Colombia
  'cmr77dvv600atrx06m7j6wrt1', // Superliga
  '356', // Amistosos internacionales: ID oficial de cobertura; se filtra por selección Colombia.
  // Competiciones UEFA relevantes
  'cmr77dw3900f5rx06j05wgzv4', // Champions League
  'cmr77dw3900f6rx06tuqwft2d', // Europa League
  'cmr77dw3900f9rx06laad8onf', // Conference League
  'cmr77dw4800fgrx06rwmig2h8', // Nations League
  'cmr77dw4800ferx06u57oohrh', // European Championship
  'cmr77dw4800fhrx065oy5co7g', // UEFA Super Cup
  // Cinco ligas principales
  'cmr77dvkr005nrx06lp7rvp49', // Premier League
  'cmr77dvnt006nrx063v3w622e', // La Liga
  'cmr77dvpd006yrx06zig7907g', // Serie A
  'cmr77dvgm0002rx06rt2uqxii', // Bundesliga
  'cmr77dvqg007crx06q1kaceyo'  // Ligue 1
] as const
