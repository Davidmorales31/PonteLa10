import type {
  ArticuloLanding,
  ArticuloTechLanding,
  CategoriaLanding,
  CuentaCtaLanding,
  EspecialLanding,
  FooterLanding,
  HeroLanding,
  ItemNavegacionLanding
} from '~/types/landing'

export const navegacionLanding: ItemNavegacionLanding[] = [
  { etiqueta: 'Inicio', ruta: '/', exacta: true },
  { etiqueta: 'Fútbol', ruta: '/articulos?categoria=futbol' },
  { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Especiales', ruta: '/especiales' },
  { etiqueta: 'Gaming', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion' }
]

export const heroLanding: HeroLanding = {
  titulo: [
    { texto: 'Deporte, tecnología y tendencias con la ' },
    { texto: 'jugada', destacado: true },
    { texto: ' clara.' }
  ],
  descripcion: 'Noticias, análisis y especiales interactivos para vivir el deporte desde otra cancha.',
  accionPrincipal: { etiqueta: 'Entrar a la jugada', ruta: '/articulos' },
  accionSecundaria: { etiqueta: 'Ver especiales', ruta: '/especiales' },
  imagen: '/editorial/login_pont3la10_estadio_sin_logo.png',
  descripcionImagen: 'Jugadores con camiseta amarilla celebrando ante una tribuna llena',
  estadisticas: [
    { valor: '1.250+', etiqueta: 'Noticias publicadas', icono: 'noticias' },
    { valor: '25K+', etiqueta: 'Comunidad activa', icono: 'comunidad' },
    { valor: '15+', etiqueta: 'Especiales interactivos', icono: 'rayo' }
  ],
  tarjetasFlotantes: [
    {
      categoria: 'Especial',
      titulo: 'Simulador Mundial',
      detalle: 'Próximamente',
      ruta: '/especiales',
      icono: 'trofeo',
      tono: 'amarillo'
    },
    {
      categoria: 'Actualidad',
      titulo: 'España vuelve a la cima del mundo',
      detalle: 'Actualizado ayer',
      ruta: '/articulos/espana-campeona-mundial-2026',
      icono: 'balon',
      tono: 'azul'
    }
  ]
}

export const articuloDestacadoLanding: ArticuloLanding = {
  slug: 'colombia-mundial-2026-balance-octavos',
  categoria: 'Selección Colombia',
  titulo: 'Colombia volvió al Mundial y dejó una base para la próxima jugada',
  resumen:
    'La Selección regresó a la cita global, alcanzó los octavos de final y ahora empieza el análisis de lo que viene.',
  imagen: '/editorial/login_pont3la10_estadio_sin_logo.png',
  descripcionImagen: 'Jugadores colombianos abrazados celebrando frente a la tribuna',
  publicadoHace: 'Hace 35 min',
  tiempoLectura: '4 min de lectura',
  ruta: '/articulos/colombia-mundial-2026-balance-octavos',
  tonoCategoria: 'azul',
  posicionImagen: '50% 66%',
  fuenteNombre: 'FIFA',
  fuenteUrl:
    'https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/articles/cuadro-seleccion-colombia-copa-mundial-2026-contra-quien-juega-partidos-cruces-rivales'
}

export const articulosRecientesLanding: ArticuloLanding[] = [
  {
    slug: 'espana-campeona-mundial-2026',
    categoria: 'Mundial 2026',
    titulo: 'España es campeona: la final que se decidió en tiempo extra',
    imagen: '/editorial/login_pont3la10_estadio_sin_logo.png',
    descripcionImagen: 'Futbolistas celebrando juntos dentro de un estadio',
    publicadoHace: 'Hace 45 min',
    tiempoLectura: '3 min',
    ruta: '/articulos/espana-campeona-mundial-2026',
    tonoCategoria: 'amarillo',
    posicionImagen: '50% 64%',
    fuenteNombre: 'FIFA',
    fuenteUrl:
      'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-argentina-final-report-highlights'
  },
  {
    slug: 'mbappe-bota-oro-record-mundial',
    categoria: 'Fútbol mundial',
    titulo: 'Mbappé firma diez goles y se queda con la Bota de Oro',
    imagen: '/editorial/futbol_colombiano_el_mercado_se_calienta.png',
    descripcionImagen: 'Futbolista con camiseta amarilla levantando el puño en el estadio',
    publicadoHace: 'Hace 1 hora',
    tiempoLectura: '2 min',
    ruta: '/articulos/mbappe-bota-oro-record-mundial',
    tonoCategoria: 'azul',
    posicionImagen: '50% 18%',
    fuenteNombre: 'FIFA',
    fuenteUrl:
      'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/award-winners'
  },
  {
    slug: 'fifa-ai-pro-datos-mundial',
    categoria: 'Tech deportiva',
    titulo: 'Football AI Pro: así cambió la lectura de millones de datos',
    imagen: '/editorial/tecnologia_deportiva_sprite.png',
    descripcionImagen: 'Sala de análisis de fútbol con visualizaciones de inteligencia artificial',
    publicadoHace: 'Hace 2 horas',
    tiempoLectura: '4 min',
    ruta: '/articulos/fifa-ai-pro-datos-mundial',
    tonoCategoria: 'verde',
    posicionImagen: '0% 0%',
    fuenteNombre: 'FIFA Football Technology',
    fuenteUrl:
      'https://football-technology.fifa.com/organisation/media-releases/lenovo-tech-world-ai-powered-innovations-world-cup-2026'
  },
  {
    slug: 'fc-26-modo-internacional-48-selecciones',
    categoria: 'Gaming',
    titulo: 'FC 26 lleva el torneo de 48 selecciones a la consola',
    imagen: '/editorial/la_hinchada_colombiana_celebra_con_fuerza.png',
    descripcionImagen: 'Celebración de fútbol bajo las luces de un estadio',
    publicadoHace: 'Hace 3 horas',
    tiempoLectura: '3 min',
    ruta: '/articulos/fc-26-modo-internacional-48-selecciones',
    tonoCategoria: 'violeta',
    posicionImagen: '50% 18%',
    fuenteNombre: 'EA Sports',
    fuenteUrl: 'https://www.ea.com/games/ea-sports-fc/fc-26/features/fc-26-the-worlds-game'
  }
]

export const categoriasLanding: CategoriaLanding[] = [
  { etiqueta: 'Fútbol mundial', icono: 'balon', ruta: '/articulos?categoria=futbol-mundial' },
  {
    etiqueta: 'Fútbol colombiano',
    icono: 'banderaColombia',
    ruta: '/articulos?categoria=futbol-colombiano',
    variante: 'colombia'
  },
  { etiqueta: 'Tech deportiva', icono: 'chip', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Gaming deportivo', icono: 'control', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Tendencias', icono: 'tendencia', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Opinión', icono: 'mensajes', ruta: '/articulos?categoria=opinion' },
  { etiqueta: 'Especiales', icono: 'estrella', ruta: '/especiales' }
]

export const especialesLanding: EspecialLanding[] = [
  {
    titulo: 'Simulador Mundial',
    descripcion: 'Arma tus grupos, cruces y predice al campeón.',
    badge: 'Próximamente',
    accion: { etiqueta: 'Explorar', ruta: '/especiales' },
    icono: 'trofeo',
    posicionSprite: 'primero'
  },
  {
    titulo: 'Álbum Panini',
    descripcion: 'Controla tus faltantes, repetidas y progreso.',
    accion: { etiqueta: 'Ver álbum', ruta: '/especiales' },
    icono: 'chip',
    posicionSprite: 'segundo'
  },
  {
    titulo: 'Polla mundialista',
    descripcion: 'Crea tu grupo, invita amigos y compite por el primer lugar.',
    accion: { etiqueta: 'Crear grupo', ruta: '/especiales' },
    icono: 'trofeo',
    posicionSprite: 'tercero'
  }
]

export const articulosTechLanding: ArticuloTechLanding[] = [
  {
    titulo: 'El VAR y la inteligencia artificial: la nueva capa del análisis',
    publicadoHace: 'Hace 1 día',
    tiempoLectura: '5 min',
    ruta: '/articulos/fifa-ai-pro-datos-mundial',
    posicionSprite: 'primero',
    fuenteNombre: 'FIFA Football Technology',
    fuenteUrl:
      'https://football-technology.fifa.com/organisation/media-releases/lenovo-tech-world-ai-powered-innovations-world-cup-2026'
  },
  {
    titulo: 'Sensores que miden lo que antes no se podía medir',
    publicadoHace: 'Hace 2 días',
    tiempoLectura: '4 min',
    ruta: '/articulos/sensores-rendimiento-futbol',
    posicionSprite: 'segundo'
  },
  {
    titulo: 'Realidad aumentada: así se dibuja el partido en 3D',
    publicadoHace: 'Hace 3 días',
    tiempoLectura: '4 min',
    ruta: '/articulos/realidad-aumentada-futbol',
    posicionSprite: 'tercero'
  },
  {
    titulo: 'Botas inteligentes: cuando los datos mejoran tu juego',
    publicadoHace: 'Hace 4 días',
    tiempoLectura: '3 min',
    ruta: '/articulos/botas-inteligentes-datos',
    posicionSprite: 'cuarto'
  }
]

export const cuentaCtaLanding: CuentaCtaLanding = {
  titulo: [
    { texto: 'Tu cuenta te pone en la ' },
    { texto: 'jugada', destacado: true },
    { texto: ' completa.' }
  ],
  beneficios: [
    { icono: 'nube', texto: 'Guarda tu progreso en especiales' },
    { icono: 'campana', texto: 'Recibe contenido exclusivo' },
    { icono: 'comunidad', texto: 'Compite y comparte con amigos' }
  ],
  accionPrincipal: { etiqueta: 'Crear cuenta', ruta: '/login?modo=registro' },
  accionSecundaria: { etiqueta: 'Entrar', ruta: '/login' }
}

export const footerLanding: FooterLanding = {
  descripcion: 'Deportes, tecnología y tendencias con la jugada clara.',
  columnas: [
    {
      titulo: 'Navegación',
      enlaces: [
        { etiqueta: 'Inicio', ruta: '/' },
        { etiqueta: 'Noticias', ruta: '/articulos' },
        { etiqueta: 'Especiales', ruta: '/especiales' },
        { etiqueta: 'Gaming', ruta: '/articulos?categoria=gaming' },
        { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion' }
      ]
    },
    {
      titulo: 'Explorar',
      enlaces: [
        { etiqueta: 'Fútbol mundial', ruta: '/articulos?categoria=futbol-mundial' },
        { etiqueta: 'Fútbol colombiano', ruta: '/articulos?categoria=futbol-colombiano' },
        { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' },
        { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' },
        { etiqueta: 'Especiales', ruta: '/especiales' }
      ]
    },
    {
      titulo: 'Empresa',
      enlaces: [
        { etiqueta: 'Quiénes somos', ruta: '/articulos' },
        { etiqueta: 'Contacto', ruta: '/articulos' },
        { etiqueta: 'Publicidad', ruta: '/articulos' },
        { etiqueta: 'Términos y condiciones', ruta: '/articulos' },
        { etiqueta: 'Política de privacidad', ruta: '/articulos' }
      ]
    }
  ],
  textoNewsletter: 'Recibe las mejores jugadas en tu correo.'
}
