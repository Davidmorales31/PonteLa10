export interface PerfilJugadorEuropa {
  slug: string
  nombre: string
  nacionalidad: string
  club: string
  urlClub: string
  posicion: string
  competencia: string
  paisCompetencia: string
  aliasClub: string[]
  descripcionVerificada: string
  fuenteOficialUrl: string
  fuentesAdicionales: { etiqueta: string, url: string }[]
  calendarioOficialUrl: string
  calendarioOficialEtiqueta: string
  verificadoEn: string
}

/** Perfiles de lanzamiento sustentados en fuentes oficiales consultadas el 2026-10-06. */
export const jugadoresColombianosEuropa: PerfilJugadorEuropa[] = [
  {
    slug: 'luis-diaz',
    nombre: 'Luis Díaz',
    nacionalidad: 'Colombia',
    club: 'FC Bayern München',
    urlClub: 'https://fcbayern.com/es/teams/first-team/luis-diaz',
    posicion: 'Delantero',
    competencia: 'Bundesliga',
    paisCompetencia: 'Alemania',
    aliasClub: ['FC Bayern München', 'Bayern Munich', 'Bayern München', 'Bayern'],
    descripcionVerificada: 'El perfil oficial del FC Bayern identifica a Luis Díaz como delantero colombiano, registra su llegada al club en julio de 2025 y señala un contrato hasta junio de 2029. La agenda enlazada corresponde al calendario oficial del primer equipo; las fechas pueden cambiar por decisiones de las competiciones.',
    fuenteOficialUrl: 'https://fcbayern.com/es/teams/first-team/luis-diaz',
    fuentesAdicionales: [
      { etiqueta: 'Presentación oficial del fichaje', url: 'https://fcbayern.com/es/noticias/2025/07/nueva-incorporacion-el-fc-bayern-ficha-a-luis-diaz' }
    ],
    calendarioOficialUrl: 'https://fcbayern.com/en/match-center/matchplan',
    calendarioOficialEtiqueta: 'Calendario oficial del FC Bayern',
    verificadoEn: '2026-10-06T17:00:00.000Z'
  },
  {
    slug: 'jhon-lucumi',
    nombre: 'Jhon Lucumí',
    nacionalidad: 'Colombia',
    club: 'Juventus',
    urlClub: 'https://www.juventus.com/en/news/articles/jhon-lucumi-joins-juventus',
    posicion: 'Defensa',
    competencia: 'Serie A',
    paisCompetencia: 'Italia',
    aliasClub: ['Juventus', 'Juventus FC', 'Juventus F.C.'],
    descripcionVerificada: 'Juventus anunció en agosto de 2026 la incorporación definitiva de Jhon Lucumí desde Bologna y un contrato hasta junio de 2030. El club lo describe como defensor colombiano y lo incluyó en sus listas oficiales del primer equipo y de la Europa League 2026/27. Su calendario oficial es la referencia para próximos compromisos.',
    fuenteOficialUrl: 'https://www.juventus.com/en/news/articles/jhon-lucumi-joins-juventus',
    fuentesAdicionales: [
      { etiqueta: 'Lista oficial para Europa League 2026/27', url: 'https://www.juventus.com/en/news/articles/bianconeri-submit-uefa-player-list-for-europa-league-02-09-26?appview=true' }
    ],
    calendarioOficialUrl: 'https://www.juventus.com/en/teams/first-team-men/fixtures-results/',
    calendarioOficialEtiqueta: 'Partidos oficiales de Juventus',
    verificadoEn: '2026-10-06T17:00:00.000Z'
  },
  {
    slug: 'davinson-sanchez',
    nombre: 'Dávinson Sánchez',
    nacionalidad: 'Colombia',
    club: 'Galatasaray',
    urlClub: 'https://www.galatasaray.org/p/davinson-sanchez/3151',
    posicion: 'Defensa',
    competencia: 'Süper Lig',
    paisCompetencia: 'Turquía',
    aliasClub: ['Galatasaray', 'Galatasaray SK', 'Galatasaray S.K.'],
    descripcionVerificada: 'El perfil oficial de Galatasaray clasifica a Dávinson Sánchez como defensor y sitúa su nacimiento en Guásimo, Colombia. La plantilla oficial de la temporada 2026/27 lo mantiene en el primer equipo. Para la programación de liga y torneos continentales enlazamos directamente la agenda publicada por el club.',
    fuenteOficialUrl: 'https://www.galatasaray.org/p/davinson-sanchez/3151',
    fuentesAdicionales: [
      { etiqueta: 'Plantilla oficial de Galatasaray', url: 'https://www.galatasaray.org/en/pl/squad/48' },
      { etiqueta: 'Calendario oficial de Süper Lig 2026/27', url: 'https://www.galatasaray.org/haber/futbol/galatasarayin-super-lig-2026-2027-sezonu-fiksturu-belli-oldu/60565' },
      { etiqueta: 'Calendario oficial de Champions League 2026/27', url: 'https://www.galatasaray.org/haber/futbol/sampiyonlar-ligi/sampiyonlar-ligi-fiksturumuz-belli-oldu/60836' }
    ],
    calendarioOficialUrl: 'https://www.galatasaray.org/haber/futbol/galatasarayin-super-lig-2026-2027-sezonu-fiksturu-belli-oldu/60565',
    calendarioOficialEtiqueta: 'Calendario oficial de Galatasaray',
    verificadoEn: '2026-10-06T17:00:00.000Z'
  }
]

export function buscarPerfilJugadorEuropa(slug: string): PerfilJugadorEuropa | null {
  return jugadoresColombianosEuropa.find(perfil => perfil.slug === slug) || null
}

export function normalizarNombreClubJugador(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function partidoCorrespondeAClubJugador(
  partido: { equipoLocal: { nombre: string }, equipoVisitante: { nombre: string } },
  perfil: PerfilJugadorEuropa
): boolean {
  const alias = new Set(perfil.aliasClub.map(normalizarNombreClubJugador))
  return alias.has(normalizarNombreClubJugador(partido.equipoLocal.nombre))
    || alias.has(normalizarNombreClubJugador(partido.equipoVisitante.nombre))
}
