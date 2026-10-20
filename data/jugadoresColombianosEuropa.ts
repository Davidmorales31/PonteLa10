export interface PerfilJugadorEuropa {
  slug: string
  imagenPerfil: string
  fuenteImagenUrl: string
  autorImagen?: string
  licenciaImagenUrl?: string
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

/** Fichas sustentadas en fuentes oficiales; verificadoEn registra el contraste individual. */
export const jugadoresColombianosEuropa: PerfilJugadorEuropa[] = [
  {
    slug: 'luis-diaz',
    imagenPerfil: '/images/jugadores-europa/luis-diaz.webp',
    fuenteImagenUrl: 'https://fcbayern.com/en/teams/first-team/luis-diaz',
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
    imagenPerfil: '/images/jugadores-europa/jhon-lucumi.webp',
    fuenteImagenUrl: 'https://www.juventus.com/en/teams/first-team-men/squad/jhon-janer-lucumi-bonilla?appview=true',
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
    imagenPerfil: '/images/jugadores-europa/davinson-sanchez.webp',
    fuenteImagenUrl: 'https://www.galatasaray.org/p/davinson-sanchez/3151',
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
  },
  {
    slug: 'jhon-cordoba',
    imagenPerfil: '/images/jugadores-europa/jhon-cordoba.webp',
    fuenteImagenUrl: 'https://fckrasnodar.ru/en/team/squad/player/?person_id=169286',
    nombre: 'Jhon Córdoba',
    nacionalidad: 'Colombia',
    club: 'FC Krasnodar',
    urlClub: 'https://fckrasnodar.ru/en/team/squad/player/?person_id=169286',
    posicion: 'Delantero',
    competencia: 'Russian Premier League',
    paisCompetencia: 'Rusia',
    aliasClub: ['FC Krasnodar', 'Krasnodar', 'FK Krasnodar'],
    descripcionVerificada: 'El perfil oficial de FC Krasnodar identifica a Jhon Córdoba como atacante colombiano y registra su participación con el primer equipo en la temporada 2026/27.',
    fuenteOficialUrl: 'https://fckrasnodar.ru/en/team/squad/player/?person_id=169286',
    fuentesAdicionales: [
      { etiqueta: 'Plantilla oficial de FC Krasnodar', url: 'https://fckrasnodar.ru/en/team/squad/' }
    ],
    calendarioOficialUrl: 'https://fckrasnodar.ru/team/calendar/',
    calendarioOficialEtiqueta: 'Calendario oficial de FC Krasnodar',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'linda-caicedo',
    imagenPerfil: '/images/jugadores-europa/linda-caicedo.webp',
    fuenteImagenUrl: 'https://www.realmadrid.com/en-US/football/womens-team/players/linda-caicedo-alegria',
    nombre: 'Linda Caicedo',
    nacionalidad: 'Colombia',
    club: 'Real Madrid Femenino',
    urlClub: 'https://www.realmadrid.com/en-US/football/womens-team/players/linda-caicedo-alegria',
    posicion: 'Delantera',
    competencia: 'Liga F',
    paisCompetencia: 'España',
    aliasClub: ['Real Madrid Femenino', 'Real Madrid CF Femenino', 'Real Madrid Women', 'Real Madrid CF Women'],
    descripcionVerificada: 'Real Madrid identifica a Linda Caicedo como delantera colombiana y mantiene su trayectoria con el equipo femenino desde 2023.',
    fuenteOficialUrl: 'https://www.realmadrid.com/en-US/football/womens-team/players/linda-caicedo-alegria',
    fuentesAdicionales: [
      { etiqueta: 'Calendario de Liga F 2026/27', url: 'https://www.realmadrid.com/en-US/news/football/womens-team/latest-news/asi-queda-el-calendario-del-real-madrid-para-la-liga-f-2026-27-30-06-2026' }
    ],
    calendarioOficialUrl: 'https://www.realmadrid.com/en-US/schedule?filter-football=primer-equipo-femenino',
    calendarioOficialEtiqueta: 'Calendario oficial del Real Madrid Femenino',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'jhon-duran',
    imagenPerfil: '/images/jugadores-europa/jhon-duran.webp',
    fuenteImagenUrl: 'https://commons.wikimedia.org/wiki/File:Jhon_Dur%C3%A1n,_SL_Benfica,_21_Jul_2026.jpg',
    autorImagen: 'Sport Lisboa e Benfica, vía Wikimedia Commons',
    licenciaImagenUrl: 'https://creativecommons.org/licenses/by/4.0/',
    nombre: 'Jhon Durán',
    nacionalidad: 'Colombia',
    club: 'SL Benfica',
    urlClub: 'https://www.slbenfica.pt/pt-pt/futebol/plantel-principal/Duran-Jhon?season=26-27',
    posicion: 'Delantero',
    competencia: 'Primeira Liga',
    paisCompetencia: 'Portugal',
    aliasClub: ['SL Benfica', 'Benfica', 'Sport Lisboa e Benfica', 'Benfica Lisboa'],
    descripcionVerificada: 'La ficha y la plantilla oficial del Benfica incluyen a Jhon Durán como delantero del primer equipo para 2026/27.',
    fuenteOficialUrl: 'https://www.slbenfica.pt/pt-pt/futebol/plantel-principal/Duran-Jhon?season=26-27',
    fuentesAdicionales: [
      { etiqueta: 'Agenda oficial del Benfica', url: 'https://www.slbenfica.pt/pt-pt/agora/agenda?ModID=12' }
    ],
    calendarioOficialUrl: 'https://www.slbenfica.pt/pt-pt/agora/agenda?ModID=12',
    calendarioOficialEtiqueta: 'Agenda oficial del Benfica',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'camilo-duran',
    imagenPerfil: '/images/jugadores-europa/camilo-duran.webp',
    fuenteImagenUrl: 'https://www.celticfc.com/news/2026/july/10/celtic-are-delighted-to-sign-colombian-forward--camilo-duran-/',
    nombre: 'Camilo Durán',
    nacionalidad: 'Colombia',
    club: 'Celtic FC',
    urlClub: 'https://www.celticfc.com/teams/',
    posicion: 'Delantero',
    competencia: 'Scottish Premiership',
    paisCompetencia: 'Escocia',
    aliasClub: ['Celtic FC', 'Celtic', 'The Celtic Football Club'],
    descripcionVerificada: 'Celtic incluye a Camilo Durán como delantero en su plantilla 2026/27 y confirmó su incorporación desde Qarabag en julio de 2026.',
    fuenteOficialUrl: 'https://www.celticfc.com/teams/',
    fuentesAdicionales: [
      { etiqueta: 'Anuncio oficial de su fichaje', url: 'https://www.celticfc.com/news/2026/july/10/celtic-are-delighted-to-sign-colombian-forward--camilo-duran-/' },
      { etiqueta: 'Lista oficial para la Europa League 2026/27', url: 'https://www.celticfc.com/news/2026/september/03/celtic-confirm-squad-for-uel-league-phase-campaign/' }
    ],
    calendarioOficialUrl: 'https://www.celticfc.com/fixtures/6860',
    calendarioOficialEtiqueta: 'Partidos oficiales del Celtic',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'cucho-hernandez',
    imagenPerfil: '/images/jugadores-europa/cucho-hernandez.webp',
    fuenteImagenUrl: 'https://www.realbetisbalompie.es/first_team/plantilla/',
    nombre: 'Cucho Hernández',
    nacionalidad: 'Colombia',
    club: 'Real Betis',
    urlClub: 'https://en.realbetisbalompie.es/first_team/squad/',
    posicion: 'Delantero',
    competencia: 'LaLiga',
    paisCompetencia: 'España',
    aliasClub: ['Real Betis', 'Real Betis Balompié', 'Real Betis Balompie', 'Betis'],
    descripcionVerificada: 'La plantilla oficial del Real Betis incluye a Cucho como delantero. El club lo identifica como jugador colombiano en el anuncio de su fichaje.',
    fuenteOficialUrl: 'https://www.realbetisbalompie.es/noticias/actualidad/el-real-betis-y-el-columbus-crew-sc-llegan-a-un-acuerdo-para-el-traspaso-del-cucho-hernandez-31015',
    fuentesAdicionales: [
      { etiqueta: 'Plantilla oficial del Real Betis', url: 'https://en.realbetisbalompie.es/first_team/squad/' }
    ],
    calendarioOficialUrl: 'https://www.realbetisbalompie.es/primer-equipo/partidos/primer-equipo',
    calendarioOficialEtiqueta: 'Calendario oficial del Real Betis',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'nelson-deossa',
    imagenPerfil: '/images/jugadores-europa/nelson-deossa.webp',
    fuenteImagenUrl: 'https://www.realbetisbalompie.es/first_team/jugador/n-deossa-1029240',
    nombre: 'Nelson Deossa',
    nacionalidad: 'Colombia',
    club: 'Real Betis',
    urlClub: 'https://www.realbetisbalompie.es/first_team/jugador/n-deossa-1029240',
    posicion: 'Mediocampista',
    competencia: 'LaLiga',
    paisCompetencia: 'España',
    aliasClub: ['Real Betis', 'Real Betis Balompié', 'Real Betis Balompie', 'Betis'],
    descripcionVerificada: 'La ficha oficial del Real Betis identifica a Nelson Deossa como centrocampista y aparece en la plantilla del primer equipo 2026/27.',
    fuenteOficialUrl: 'https://www.realbetisbalompie.es/first_team/jugador/n-deossa-1029240',
    fuentesAdicionales: [
      { etiqueta: 'Plantilla oficial del Real Betis', url: 'https://www.realbetisbalompie.es/first_team/plantilla/' }
    ],
    calendarioOficialUrl: 'https://www.realbetisbalompie.es/primer-equipo/partidos/primer-equipo',
    calendarioOficialEtiqueta: 'Calendario oficial del Real Betis',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'gustavo-puerta',
    imagenPerfil: '/images/jugadores-europa/gustavo-puerta.webp',
    fuenteImagenUrl: 'https://www.olympiacos.org/en/team/',
    nombre: 'Gustavo Puerta',
    nacionalidad: 'Colombia',
    club: 'Olympiacos FC',
    urlClub: 'https://www.olympiacos.org/en/team/',
    posicion: 'Mediocampista',
    competencia: 'Super League Greece',
    paisCompetencia: 'Grecia',
    aliasClub: ['Olympiacos FC', 'Olympiacos', 'Olympiacos CFP', 'Olympiakos'],
    descripcionVerificada: 'Olympiacos anunció el fichaje de Gustavo Puerta como mediocampista internacional colombiano y lo mantiene en su plantilla oficial.',
    fuenteOficialUrl: 'https://www.olympiacos.org/en/2026/09/02/gustavo-puerta-joins-olympiacos/',
    fuentesAdicionales: [
      { etiqueta: 'Plantilla oficial de Olympiacos', url: 'https://www.olympiacos.org/en/team/' }
    ],
    calendarioOficialUrl: 'https://www.olympiacos.org/es/programas-de-partidos/',
    calendarioOficialEtiqueta: 'Programación oficial de partidos de Olympiacos',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'yaser-asprilla',
    imagenPerfil: '/images/jugadores-europa/yaser-asprilla.webp',
    fuenteImagenUrl: 'https://www.gironafc.cat/es/noticias/yaser-asprilla-nou-jugador-del-girona-fc',
    nombre: 'Yáser Asprilla',
    nacionalidad: 'Colombia',
    club: 'Girona FC',
    urlClub: 'https://www.gironafc.cat/es/noticias/el-girona-fc-pone-en-marcha-manana-la-pretemporada-2026-2027',
    posicion: 'Extremo',
    competencia: 'LaLiga Hypermotion',
    paisCompetencia: 'España',
    aliasClub: ['Girona FC', 'Girona', 'Girona Futbol Club'],
    descripcionVerificada: 'Girona incluyó a Asprilla en la plantilla que inició la pretemporada 2026/27. El club lo presenta como extremo colombiano.',
    fuenteOficialUrl: 'https://www.gironafc.cat/es/noticias/el-girona-fc-pone-en-marcha-manana-la-pretemporada-2026-2027',
    fuentesAdicionales: [
      { etiqueta: 'Anuncio oficial de su fichaje', url: 'https://www.gironafc.cat/es/noticias/yaser-asprilla-nou-jugador-del-girona-fc' }
    ],
    calendarioOficialUrl: 'https://www.gironafc.cat/es/partidos',
    calendarioOficialEtiqueta: 'Partidos oficiales del Girona FC',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'jhon-solis',
    imagenPerfil: '/images/jugadores-europa/jhon-solis.webp',
    fuenteImagenUrl: 'https://www.ceroacero.com.co/jugador/jhon-solis/867604/fotos-de-perfil',
    nombre: 'Jhon Solís',
    nacionalidad: 'Colombia',
    club: 'Birmingham City',
    urlClub: 'https://www.bcfc.com/teams',
    posicion: 'Mediocampista',
    competencia: 'EFL Championship',
    paisCompetencia: 'Inglaterra',
    aliasClub: ['Birmingham City', 'Birmingham City FC', 'Birmingham'],
    descripcionVerificada: 'Jhon Solís figura como mediocampista del Birmingham City en los registros de la Championship 2026/27. El club anunció inicialmente su llegada desde Girona en enero de 2026.',
    fuenteOficialUrl: 'https://www.linkedin.com/posts/birmingham-city-fc_birmingham-city-is-delighted-to-confirm-the-activity-7418231529610469376-ghKH',
    fuentesAdicionales: [
      { etiqueta: 'Estadísticas de la Championship 2026/27 (EFL/Opta)', url: 'https://www.efl.com/news/2026/september/18/sky-bet-championship--pre-match-stat-pack/' },
      { etiqueta: 'Ficha de jugador y temporada actual', url: 'https://theanalyst.com/players/1449/jhon-solis' }
    ],
    calendarioOficialUrl: 'https://www.bcfc.com/fixtures',
    calendarioOficialEtiqueta: 'Partidos del Birmingham City',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'royer-caicedo',
    imagenPerfil: '/images/jugadores-europa/royer-caicedo.webp',
    fuenteImagenUrl: 'https://cerclebrugge.be/teams/a-team/players/royer-caicedo',
    nombre: 'Royer Caicedo',
    nacionalidad: 'Colombia',
    club: 'Cercle Brugge',
    urlClub: 'https://cerclebrugge.be/teams/a-team/players/royer-caicedo',
    posicion: 'Defensa',
    competencia: 'Belgian Pro League',
    paisCompetencia: 'Bélgica',
    aliasClub: ['Cercle Brugge', 'Cercle Brugge KSV', 'Cercle Brugge Koninklijke Sportvereniging'],
    descripcionVerificada: 'El perfil y la plantilla oficial del Cercle Brugge incluyen a Royer Caicedo como defensor colombiano del primer equipo.',
    fuenteOficialUrl: 'https://cerclebrugge.be/teams/a-team/players/royer-caicedo',
    fuentesAdicionales: [
      { etiqueta: 'Plantilla oficial del Cercle Brugge', url: 'https://cerclebrugge.be/teams/a-team' }
    ],
    calendarioOficialUrl: 'https://cerclebrugge.be/teams/a-team/calendar',
    calendarioOficialEtiqueta: 'Calendario oficial del Cercle Brugge',
    verificadoEn: '2026-10-19T12:00:00.000Z'
  },
  {
    slug: 'luis-suarez',
    imagenPerfil: '/images/jugadores-europa/luis-suarez.webp',
    fuenteImagenUrl: 'https://www.sporting.pt/pt/futebol/equipa-principal/plantel/luis-javier-suarez-charris',
    nombre: 'Luis Suárez',
    nacionalidad: 'Colombia',
    club: 'Sporting CP',
    urlClub: 'https://www.sporting.pt/pt/futebol/equipa-principal/plantel/luis-javier-suarez-charris',
    posicion: 'Delantero',
    competencia: 'Primeira Liga',
    paisCompetencia: 'Portugal',
    aliasClub: ['Sporting CP', 'Sporting Clube de Portugal', 'Sporting', 'Sporting Lisboa'],
    descripcionVerificada: 'El perfil oficial del Sporting identifica a Luis Suárez como delantero colombiano del primer equipo y registra su llegada al club en agosto de 2025.',
    fuenteOficialUrl: 'https://www.sporting.pt/pt/futebol/equipa-principal/plantel/luis-javier-suarez-charris',
    fuentesAdicionales: [
      { etiqueta: 'Calendario oficial del Sporting', url: 'https://www.sporting.pt/pt/futebol/all/calendario' }
    ],
    calendarioOficialUrl: 'https://www.sporting.pt/pt/futebol/all/calendario',
    calendarioOficialEtiqueta: 'Calendario oficial del Sporting CP',
    verificadoEn: '2026-10-19T12:00:00.000Z'
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
