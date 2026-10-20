export interface HitoTrayectoriaJugador {
  periodo: string
  club: string
  detalle: string
}

export interface VideoJugadorEuropa {
  titulo: string
  canal: string
  url: string
  miniaturaUrl: string
}

export interface HistoriaJugadorEuropa {
  historia: string
  hito: string
  etiquetaHito: string
  trayectoria: HitoTrayectoriaJugador[]
  videos: VideoJugadorEuropa[]
  fuentes: { etiqueta: string, url: string }[]
}

const enlazarVideoYoutube = (videoId: string) => ({
  url: `https://www.youtube.com/watch?v=${videoId}`,
  miniaturaUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
})

/** Relatos breves contrastados con los enlaces visibles al pie de cada ficha. */
export const historiasJugadoresEuropa: Record<string, HistoriaJugadorEuropa> = {
  'luis-diaz': {
    historia: 'El extremo guajiro recorrió el fútbol colombiano desde Barranquilla y Junior hasta dar el salto a Europa con Porto. Sus actuaciones en Portugal lo llevaron a Liverpool; después de tres temporadas en Inglaterra, llegó al Bayern en 2025.',
    etiquetaHito: 'Una huella goleadora en Liverpool',
    hito: 'Marcó 41 goles en 148 partidos oficiales con Liverpool, según el recuento del propio club.',
    trayectoria: [
      { periodo: 'Formación', club: 'Barranquilla FC y Junior', detalle: 'Se abrió paso en el fútbol profesional colombiano y ganó títulos con Junior.' },
      { periodo: '2019–2022', club: 'FC Porto', detalle: 'Se consolidó en Portugal y levantó títulos nacionales.' },
      { periodo: '2022–2025', club: 'Liverpool FC', detalle: 'Sumó 41 goles oficiales en 148 apariciones.' },
      { periodo: 'Desde 2025', club: 'FC Bayern München', detalle: 'Inició una nueva etapa en la Bundesliga.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('QFVX-Jd_PWg'), titulo: 'Los 41 goles de Luis Díaz con Liverpool', canal: 'Liverpool FC' },
      { ...enlazarVideoYoutube('TLP3AFgGACk'), titulo: 'El gol especial de Luis Díaz ante Bayern', canal: 'UEFA' }
    ],
    fuentes: [
      { etiqueta: 'Presentación y recorrido en Bayern', url: 'https://fcbayern.com/es/noticias/2025/07/corredor-infatigable-y-artista-del-regate-este-es-luis-diaz-el-nuevo-fichaje-del-fc-bayern' },
      { etiqueta: 'Recuento de sus 41 goles en Liverpool', url: 'https://www.liverpoolfc.com/es/news/watch-all-41-luis-diazs-goals-liverpool' }
    ]
  },
  'jhon-lucumi': {
    historia: 'Formado en Deportivo Cali, Lucumí se fue a Bélgica con apenas 20 años y convirtió su paso por Genk en la puerta de entrada a las grandes ligas. Tras cuatro temporadas en Bologna, en 2026 fichó por Juventus.',
    etiquetaHito: 'De Cali a Turín',
    hito: 'Juventus lo incorporó desde Bologna con contrato hasta 2030; el club destacó sus 152 apariciones con el equipo rossoblù.',
    trayectoria: [
      { periodo: 'Formación', club: 'Deportivo Cali', detalle: 'Debutó como profesional en el fútbol colombiano.' },
      { periodo: '2018–2022', club: 'KRC Genk', detalle: 'Tuvo su primera experiencia europea en Bélgica.' },
      { periodo: '2022–2026', club: 'Bologna FC', detalle: 'Se asentó en Serie A y disputó la Champions League.' },
      { periodo: 'Desde 2026', club: 'Juventus', detalle: 'Abrió un nuevo capítulo en Turín.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('6VEBB_vNYkI'), titulo: 'Defensas y pases de Jhon Lucumí', canal: 'WorldOfFootballHD' },
      { ...enlazarVideoYoutube('GkWaXyxW1X4'), titulo: 'Habilidades defensivas rumbo a Juventus', canal: 'SVMM' }
    ],
    fuentes: [
      { etiqueta: 'Perfil oficial de Juventus', url: 'https://www.juventus.com/en/teams/first-team-men/squad/jhon-janer-lucumi-bonilla' },
      { etiqueta: 'Anuncio de su llegada a Bologna', url: 'https://www.bolognafc.it/en/lucumi-joins-the-rossoblu/' }
    ]
  },
  'davinson-sanchez': {
    historia: 'El defensor de Guachené se dio a conocer en Atlético Nacional antes de pasar a Ajax, donde su rendimiento lo llevó a la Premier League. Tras seis temporadas con Tottenham, encontró en Galatasaray un nuevo escenario europeo y un papel importante en defensa.',
    etiquetaHito: 'Campeón en Colombia y Turquía',
    hito: 'Ganó títulos con Atlético Nacional y Galatasaray; con Ajax alcanzó la final de la Europa League en 2017.',
    trayectoria: [
      { periodo: '2013–2016', club: 'Atlético Nacional', detalle: 'Debutó y ganó títulos en Colombia.' },
      { periodo: '2016–2017', club: 'Ajax', detalle: 'Llegó a Europa y fue subcampeón de la Europa League.' },
      { periodo: '2017–2023', club: 'Tottenham Hotspur', detalle: 'Compitió en Premier League y Champions League.' },
      { periodo: 'Desde 2023', club: 'Galatasaray', detalle: 'Se incorporó al club de Estambul.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('nER1vClnN24'), titulo: 'La acción anulada de Davinson ante Başakşehir', canal: 'beIN SPORTS Türkiye' },
      { ...enlazarVideoYoutube('tOzM1Iy-H24'), titulo: 'Las mejores entradas y cierres defensivos', canal: 'YouTube' }
    ],
    fuentes: [
      { etiqueta: 'Trayectoria y ficha oficial de Galatasaray', url: 'https://www.galatasaray.org/p/davinson-sanchez/3151' },
      { etiqueta: 'Plantilla oficial de Galatasaray', url: 'https://www.galatasaray.org/en/pl/squad/48' }
    ]
  },
  'jhon-cordoba': {
    historia: 'Córdoba convirtió su potencia física y su olfato de gol en una larga carrera europea. Después de competir en España y Alemania, llegó a Krasnodar en 2021 y se convirtió en uno de los referentes ofensivos del club ruso.',
    etiquetaHito: 'Una década de goles en Europa',
    hito: 'FC Krasnodar lo registra en el primer equipo desde 2021; la guía de la Federación Colombiana documenta sus primeros pasos y su recorrido profesional.',
    trayectoria: [
      { periodo: 'Inicios', club: 'Envigado y Granada', detalle: 'Pasó del fútbol colombiano a la liga española.' },
      { periodo: '2015–2021', club: 'Mainz, Köln y Hertha BSC', detalle: 'Acumuló experiencia en la Bundesliga.' },
      { periodo: 'Desde 2021', club: 'FC Krasnodar', detalle: 'Se consolidó como delantero titular en Rusia.' },
      { periodo: 'Selección', club: 'Colombia', detalle: 'Debutó con la absoluta y anotó en sus primeros partidos.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('soFggMYGze0'), titulo: 'Goles y asistencias con Krasnodar', canal: 'La Liga del Oso' },
      { ...enlazarVideoYoutube('Uij17Ibgkx4'), titulo: 'Goles, asistencias y mejores habilidades', canal: 'YouTube' }
    ],
    fuentes: [
      { etiqueta: 'Perfil oficial de FC Krasnodar', url: 'https://fckrasnodar.ru/en/team/squad/player/?person_id=169286' },
      { etiqueta: 'Guía de medios de la Federación Colombiana', url: 'https://fcf.com.co/wp-content/uploads/2025/09/Guia-de-medios-Clasificados-a-la-Copa-Mundial-de-la-FIFA-2026.pdf' }
    ]
  },
  'linda-caicedo': {
    historia: 'Linda comenzó a llamar la atención siendo una niña en América de Cali: debutó a los 14 años y convirtió su primer sueldo en una televisión para su familia. Después de ganar con Deportivo Cali, llegó al Real Madrid y se volvió una de las figuras jóvenes de Colombia.',
    etiquetaHito: 'Un gol que recorrió el mundo',
    hito: 'En el Mundial femenino de 2023 marcó ante Alemania uno de los goles más recordados del torneo; tenía 18 años.',
    trayectoria: [
      { periodo: '2019–2020', club: 'América de Cali', detalle: 'Debutó profesionalmente a los 14 años.' },
      { periodo: '2020–2023', club: 'Deportivo Cali', detalle: 'Ganó la liga colombiana en 2021.' },
      { periodo: 'Desde 2023', club: 'Real Madrid Femenino', detalle: 'Se incorporó al fútbol europeo con 18 años.' },
      { periodo: 'Selección', club: 'Colombia', detalle: 'Fue protagonista en la Copa América y el Mundial.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('9CaOAzPgpcQ'), titulo: 'El gol de Linda ante Alemania en el Mundial', canal: 'FIFA' },
      { ...enlazarVideoYoutube('TKfpDbVdUGg'), titulo: 'El golazo ante Barcelona en Champions', canal: 'ESPN Deportes' }
    ],
    fuentes: [
      { etiqueta: 'La historia de sus inicios, por FIFA', url: 'https://www.fifa.com/es/articles/los-inicios-de-linda-caicedo-la-historia-de-la-nina-que-solo-queria-ser' },
      { etiqueta: 'Anuncio oficial del Real Madrid', url: 'https://www.realmadrid.com/es-ES/noticias/futbol/primer-equipo-femenino/actualidad/linda-caicedo-nueva-jugadora-del-real-madrid' },
      { etiqueta: 'La historia del gol ante Alemania, por FIFA', url: 'https://www.fifa.com/es/articles/linda-caicedo-colombia-copa-mundial-femenina-fifa' }
    ]
  },
  'jhon-duran': {
    historia: 'Jhon Durán pasó de debutar con Envigado a cruzar muy joven el continente: primero jugó en Chicago Fire y luego llegó a Aston Villa. Tras pasos por Arabia Saudita, en 2026 se sumó a Benfica, donde comparte su potencia y velocidad con una nueva liga.',
    etiquetaHito: 'Gol decisivo en la Champions',
    hito: 'Su gol de larga distancia ante Bayern München le dio la victoria a Aston Villa en la Champions League 2024.',
    trayectoria: [
      { periodo: '2019–2021', club: 'Envigado FC', detalle: 'Debutó en el fútbol profesional colombiano con 15 años.' },
      { periodo: '2022', club: 'Chicago Fire', detalle: 'Dio el salto a la MLS antes de cumplir 19.' },
      { periodo: '2023–2025', club: 'Aston Villa', detalle: 'Anotó en Premier League y Champions League.' },
      { periodo: 'Desde 2026', club: 'SL Benfica', detalle: 'Inició una nueva etapa en Portugal.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('YXHBgpPWlug'), titulo: 'El gol de Durán que venció al Bayern', canal: 'Aston Villa FC' },
      { ...enlazarVideoYoutube('75hsOZwBry8'), titulo: 'Todos sus goles en la Premier League', canal: 'Sky Sports Premier League' }
    ],
    fuentes: [
      { etiqueta: 'Trayectoria en la ficha de Benfica', url: 'https://www.slbenfica.pt/pt-pt/futebol/plantel-principal/Duran-Jhon?season=26-27' },
      { etiqueta: 'El gol ante Bayern, por Aston Villa', url: 'https://www.avfc.co.uk/news/2024/september/18/duran-sublime-strike-earns-villa-famous-victory-over-bayern/' }
    ]
  },
  'camilo-duran': {
    historia: 'Camilo Durán se hizo un nombre en Qarabağ con una temporada de alta producción en goles y asistencias, incluso en la Champions League. Ese rendimiento llamó la atención del Celtic, que lo fichó en 2026 para reforzar su ataque.',
    etiquetaHito: 'Explosión goleadora en Qarabağ',
    hito: 'Celtic informó que marcó 15 goles —cinco en Champions— y dio 10 asistencias en la temporada previa a su llegada.',
    trayectoria: [
      { periodo: 'Primeros pasos', club: 'Fútbol colombiano', detalle: 'Se formó como delantero antes de salir de Colombia.' },
      { periodo: 'Hasta 2026', club: 'Qarabağ FK', detalle: 'Destacó en liga local y en noches europeas.' },
      { periodo: 'Desde 2026', club: 'Celtic FC', detalle: 'Llegó a Glasgow para competir en Escocia y Europa.' },
      { periodo: 'Selección', club: 'Colombia', detalle: 'Su salto europeo amplió su proyección internacional.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('CSVqTifEs6w'), titulo: 'Gol de Camilo Durán ante Benfica en Champions', canal: 'sport tv' },
      { ...enlazarVideoYoutube('6Qw3g7uwWSg'), titulo: 'Todas las acciones de Camilo Durán en Qarabağ', canal: 'FB Highlights' }
    ],
    fuentes: [
      { etiqueta: 'Anuncio oficial del Celtic y sus cifras', url: 'https://www.celticfc.com/news/2026/july/10/celtic-are-delighted-to-sign-colombian-forward--camilo-duran-/' },
      { etiqueta: 'Ficha de UEFA', url: 'https://es.uefa.com/uefachampionsleague/clubs/players/250212186--camilo-duran/' },
      { etiqueta: 'El gol ante Ajax, por Gol Caracol', url: 'https://www.noticiascaracol.com/golcaracol/colombianos-en-el-exterior/golazo-colombiano-en-champions-league-camilo-duran-facturo-en-qarabag-vs-ajax-rg10' }
    ]
  },
  'cucho-hernandez': {
    historia: 'Cucho Hernández salió de América de Cali y vivió varias etapas en España antes de brillar en la MLS con Columbus Crew. Tras ampliar su recorrido en Estados Unidos, regresó a España en 2025 para jugar con Real Betis.',
    etiquetaHito: 'Un derbi decidido por el Cucho',
    hito: 'El Real Betis destacó su gol decisivo para ganar El Gran Derbi, un momento que lo conectó de inmediato con la afición verdiblanca.',
    trayectoria: [
      { periodo: '2015–2017', club: 'América de Cali', detalle: 'Debutó como profesional y se proyectó a Europa.' },
      { periodo: '2017–2022', club: 'Watford y clubes españoles', detalle: 'Jugó en varias etapas de LaLiga, incluyendo Huesca y Getafe.' },
      { periodo: '2022–2025', club: 'Columbus Crew', detalle: 'Sumó goles, asistencias y títulos en la MLS.' },
      { periodo: 'Desde 2025', club: 'Real Betis', detalle: 'Volvió a España para competir en LaLiga.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('t9-IlxEUZcI'), titulo: 'El gol del Cucho para ganar El Gran Derbi', canal: 'Real Betis Balompié' },
      { ...enlazarVideoYoutube('2lkOWD-aqO0'), titulo: 'Lo mejor de Cucho en 2024', canal: 'Major League Soccer' }
    ],
    fuentes: [
      { etiqueta: 'Traspaso de Columbus al Betis', url: 'https://www.realbetisbalompie.es/noticias/actualidad/el-real-betis-y-el-columbus-crew-sc-llegan-a-un-acuerdo-para-el-traspaso-del-cucho-hernandez-31015' },
      { etiqueta: 'Gol del derbi, por el Betis', url: 'https://www.youtube.com/watch?v=t9-IlxEUZcI' }
    ]
  },
  'nelson-deossa': {
    historia: 'Antes de llegar a la élite, Deossa pasó por varios clubes colombianos y trabajó en una mina mientras perseguía su oportunidad como futbolista profesional. Después ganó títulos en México con Pachuca y Monterrey; en 2025 regresó a Europa para sumarse al Betis.',
    etiquetaHito: 'Del trabajo en una mina a LaLiga',
    hito: 'Su ruta hasta el fútbol europeo tomó varios años: Deossa contó con cesiones, cambios de club y títulos internacionales antes del fichaje por Betis.',
    trayectoria: [
      { periodo: 'Inicios', club: 'Huila y Atlético Nacional', detalle: 'Se ganó un lugar en el fútbol colombiano tras superar un camino poco convencional.' },
      { periodo: '2024', club: 'Pachuca', detalle: 'Ganó la Copa de Campeones de Concacaf y otros torneos internacionales.' },
      { periodo: '2025', club: 'Monterrey', detalle: 'Continuó su crecimiento en la Liga MX.' },
      { periodo: 'Desde 2025', club: 'Real Betis', detalle: 'Dio el salto a LaLiga española.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('S7NbhzcDm7Y'), titulo: 'Todos los goles de Deossa con Pachuca', canal: 'Tuzos FC' },
      { ...enlazarVideoYoutube('f9i88beMuZU'), titulo: 'El camino de México a LaLiga', canal: 'CalienteBooksMx' }
    ],
    fuentes: [
      { etiqueta: 'Traspaso oficial al Real Betis', url: 'https://www.realbetisbalompie.es/noticias/actualidad/el-real-betis-y-el-club-de-futbol-monterrey-llegan-a-un-acuerdo-para-el-traspaso-de-nelson-deossa-31' },
      { etiqueta: 'Su historia antes de llegar a LaLiga, por AS', url: 'https://as.com/futbol/primera/de-la-mina-a-la-liga-en-seis-anos-deossa-llega-al-betis-n/' }
    ]
  },
  'gustavo-puerta': {
    historia: 'El mediocampista bogotano se formó en Colombia y llamó la atención de Bayer Leverkusen, que lo fichó en 2023. Las cesiones a Hull City y Racing de Santander le dieron rodaje europeo; en 2026 comenzó otra etapa en Olympiacos y ya sumaba 11 partidos con la selección absoluta.',
    etiquetaHito: 'Protagonista con Colombia',
    hito: 'Olympiacos resaltó sus 11 apariciones con la selección y su participación como titular hasta los octavos de final del Mundial de 2026.',
    trayectoria: [
      { periodo: 'Formación', club: 'Bogotá FC', detalle: 'Se desarrolló en el fútbol capitalino colombiano.' },
      { periodo: '2023–2025', club: 'Bayer Leverkusen y cesiones', detalle: 'Tuvo experiencias en Alemania, Hull City y Racing de Santander.' },
      { periodo: 'Desde 2026', club: 'Olympiacos', detalle: 'Se incorporó a uno de los clubes históricos de Grecia.' },
      { periodo: 'Selección', club: 'Colombia', detalle: 'Sumó minutos internacionales y participó en el Mundial de 2026.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('Wzg4gmjl6ek'), titulo: 'El gol de Puerta en su debut con Olympiacos', canal: 'Claro Sports' },
      { ...enlazarVideoYoutube('aIBxsQXQeUw'), titulo: 'Resumen y goles ante Volos', canal: 'Claro Sports' }
    ],
    fuentes: [
      { etiqueta: 'Presentación oficial en Olympiacos', url: 'https://www.olympiacos.org/es/2026/09/02/gustavo-puerta-ficha-por-el-olympiacos/' },
      { etiqueta: 'Trayectoria en Bayer Leverkusen', url: 'https://www.bayer04.de/es-es/player/werkself/exalumnos/gustavo-puerta' }
    ]
  },
  'yaser-asprilla': {
    historia: 'Yáser hizo su camino desde Envigado a Watford y luego a Girona, con el que disputó la Champions League. Pasó por Galatasaray en un préstamo durante la segunda mitad de 2025/26 y volvió a Girona para la temporada actual.',
    etiquetaHito: 'El salto a la Champions',
    hito: 'En 2026 pasó a préstamo por Galatasaray y volvió a Girona para continuar su carrera en LaLiga.',
    trayectoria: [
      { periodo: 'Hasta 2022', club: 'Envigado FC', detalle: 'Debutó como profesional y se convirtió en una de las jóvenes promesas de la liga.' },
      { periodo: '2022–2024', club: 'Watford', detalle: 'Continuó su desarrollo en el fútbol inglés.' },
      { periodo: '2024–2026', club: 'Girona FC', detalle: 'Jugó en LaLiga y tuvo experiencia en la Champions League.' },
      { periodo: 'Préstamo y regreso', club: 'Galatasaray → Girona', detalle: 'Pasó por Turquía en 2026 y regresó al Girona para la campaña 2026/27.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('Jajzr9rT4zY'), titulo: 'Bienvenida de Galatasaray a Yáser', canal: 'Galatasaray' },
      { ...enlazarVideoYoutube('c70gQlfMg3A'), titulo: 'Gol de Yáser en la victoria ante Las Palmas', canal: 'ESPN Deportes' }
    ],
    fuentes: [
      { etiqueta: 'Trayectoria en Envigado, Watford y Girona', url: 'https://www.galatasaray.org/haber/futbol/galatasaraya-hos-geldin-yaser-asprilla/59417' },
      { etiqueta: 'Anuncio oficial de su préstamo a Galatasaray', url: 'https://www.galatasaray.org/en/haber/football/yaser-asprilla-joins-galatasaray/59429' },
      { etiqueta: 'Plantilla del Girona para 2026/27', url: 'https://www.gironafc.cat/es/noticias/el-girona-fc-pone-en-marcha-manana-la-pretemporada-2026-2027' }
    ]
  },
  'jhon-solis': {
    historia: 'Jhon Solís se formó en Atlético Nacional y dio el salto a Europa en 2023 con Girona. Luego llegó a Birmingham City, donde marcó ante Barcelona en un amistoso de 2026 y consiguió continuidad en el fútbol inglés.',
    etiquetaHito: 'Un gol frente al Barcelona',
    hito: 'En julio de 2026 convirtió el empate de Birmingham ante Barcelona con un remate de primera tras una jugada de tiro libre.',
    trayectoria: [
      { periodo: 'Hasta 2023', club: 'Atlético Nacional', detalle: 'Se formó en Medellín y debutó en el primer equipo.' },
      { periodo: '2023–2026', club: 'Girona FC', detalle: 'Se incorporó a LaLiga y sumó experiencia europea.' },
      { periodo: 'Desde 2026', club: 'Birmingham City', detalle: 'Encontró continuidad en el fútbol inglés.' },
      { periodo: 'Momento destacado', club: 'Birmingham vs. Barcelona', detalle: 'Marcó en un amistoso de pretemporada en 2026.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('149hg6Mc9zY'), titulo: 'Birmingham 2-2 Barcelona: el gol de Solís', canal: 'DSports' },
      { ...enlazarVideoYoutube('1THarXHeevM'), titulo: 'Detrás de cámaras de su llegada a Birmingham', canal: 'Birmingham City FC' }
    ],
    fuentes: [
      { etiqueta: 'Acuerdo entre Girona y Birmingham', url: 'https://www.gironafc.cat/es/noticias/acuerdo-con-el-birmingham-por-jhon-solis' },
      { etiqueta: 'El gol ante Barcelona, por DSports', url: 'https://www.directvsports.com/futbol/video-asi-fue-el-gol-de-solis-para-el-empate-de-birmingham-sobre-barcelona-en-un-amistoso-internacional-20260731-0046.html' },
      { etiqueta: 'Confirmación de Birmingham City', url: 'https://www.linkedin.com/posts/birmingham-city-fc_birmingham-city-is-delighted-to-confirm-the-activity-7418231529610469376-ghKH' }
    ]
  },
  'royer-caicedo': {
    historia: 'El defensor central Royer Caicedo, de 1,95 metros, se abrió paso en Atlético Nacional y celebró títulos de Copa Colombia y Superliga antes de cumplir 20 años. En 2026 se convirtió en el primer colombiano en vestir la camiseta de Cercle Brugge.',
    etiquetaHito: 'Una nueva puerta para los colombianos',
    hito: 'Cercle Brugge lo presentó como el primer futbolista colombiano de su historia y resaltó sus títulos con Atlético Nacional.',
    trayectoria: [
      { periodo: 'Formación', club: 'Atlético Nacional', detalle: 'Creció en la cantera de uno de los clubes más grandes de Colombia.' },
      { periodo: '2025–2026', club: 'Atlético Nacional', detalle: 'Ganó Copa Colombia y Superliga antes de dar el salto a Europa.' },
      { periodo: 'Desde 2026', club: 'Cercle Brugge', detalle: 'Se convirtió en el primer colombiano del equipo belga.' },
      { periodo: 'Perfil', club: 'Defensa central', detalle: 'Mide 1,95 m y se destaca en el juego aéreo.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('gF68RzUwqP0'), titulo: 'Habilidades de Royer con Atlético Nacional', canal: 'FB Highlights' },
      { ...enlazarVideoYoutube('5SLxgQKzY6o'), titulo: 'Declaraciones de Royer Caicedo', canal: 'Atlético Nacional TV' }
    ],
    fuentes: [
      { etiqueta: 'Perfil oficial de Cercle Brugge', url: 'https://cerclebrugge.be/en/teams/a-team/players/royer-caicedo' },
      { etiqueta: 'Convocatoria de Colombia', url: 'https://www.tropicanafm.com/2026/el-es-royer-caicedo-la-sorpresa-de-la-convocatoria-de-la-seleccion-colombia-juega-en-belgica-476319.html' }
    ]
  },
  'luis-suarez': {
    historia: 'El delantero de Santa Marta se formó en España y se abrió paso entre Granada, Watford y varios préstamos, entre ellos uno muy productivo en Zaragoza. Tras destacar en Almería, llegó a Sporting CP en 2025 y encontró una vitrina para competir en la Champions League.',
    etiquetaHito: 'Noche histórica en Champions',
    hito: 'En enero de 2026 anotó el gol que dio a Sporting la victoria sobre Paris Saint-Germain; el club informó que pasó a encabezar su lista goleadora en la Champions.',
    trayectoria: [
      { periodo: '2015–2019', club: 'Granada y Watford', detalle: 'Se formó en España y tuvo su primer contrato en Inglaterra.' },
      { periodo: '2019–2020', club: 'Real Zaragoza', detalle: 'Anotó 19 goles en una campaña de gran impacto en Segunda División.' },
      { periodo: '2023–2025', club: 'UD Almería', detalle: 'Regresó a España y mantuvo su producción goleadora.' },
      { periodo: 'Desde 2025', club: 'Sporting CP', detalle: 'Firmó hasta 2030 y se convirtió en un referente ofensivo.' }
    ],
    videos: [
      { ...enlazarVideoYoutube('YpgkXFPEP7o'), titulo: 'El triunfo de Sporting ante Paris Saint-Germain', canal: 'ESPN Deportes' },
      { ...enlazarVideoYoutube('VlfHVDnsov4'), titulo: 'El gol decisivo de Luis Suárez ante Lens', canal: 'ESPN Fans' }
    ],
    fuentes: [
      { etiqueta: 'Fichaje y trayectoria en Sporting CP', url: 'https://www.sporting.pt/en/news/football/main-team/2025-07-28/luis-suarez-joins-sporting-cp' },
      { etiqueta: 'El gol decisivo ante PSG, por UEFA', url: 'https://es.uefa.com/uefachampionsleague/history/video/02a1-1fbc69bf90fe-a12811b0d5f6-1000--decisivo-luis-suarez/' },
      { etiqueta: 'Su temporada con Real Zaragoza, por AS', url: 'https://as.com/futbol/segunda/la-eterna-racha-de-luis-suarez-n/' },
      { etiqueta: 'Récord goleador en Champions, por Sporting CP', url: 'https://www.sporting.pt/pt/noticias/futebol/equipa-principal/2026-10-19/luis-suarez-e-uma-honra-entrar-na-historia-deste-clube' }
    ]
  }
}
