import type {
  CategoriaLanding,
  FooterLanding,
  HeroLanding,
  ItemNavegacionLanding
} from '~/types/landing'

export const navegacionSitio: ItemNavegacionLanding[] = [
  { etiqueta: 'Inicio', ruta: '/', exacta: true },
  { etiqueta: 'Noticias', ruta: '/articulos' },
  { etiqueta: 'Fútbol', ruta: '/articulos?categoria=futbol' },
  { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Gaming', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion' }
]

export const heroSitio: HeroLanding = {
  titulo: [
    { texto: 'Deporte, tecnología y tendencias con la ' },
    { texto: 'jugada', destacado: true },
    { texto: ' clara.' }
  ],
  descripcion: 'Noticias y análisis publicados por el equipo editorial de Pont3la10.',
  accionPrincipal: { etiqueta: 'Ver noticias', ruta: '/articulos' },
  accionSecundaria: { etiqueta: 'Explorar categorías', ruta: '/articulos' },
  imagen: '/editorial/login_pont3la10_estadio_sin_logo.png',
  descripcionImagen: 'Estadio de fútbol iluminado'
}

export const categoriasSitio: CategoriaLanding[] = [
  { etiqueta: 'Fútbol mundial', icono: 'balon', ruta: '/articulos?categoria=futbol-mundial' },
  { etiqueta: 'Fútbol colombiano', icono: 'banderaColombia', ruta: '/articulos?categoria=futbol-colombiano', variante: 'colombia' },
  { etiqueta: 'Tech deportiva', icono: 'chip', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Gaming deportivo', icono: 'control', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Tendencias', icono: 'tendencia', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Opinión', icono: 'mensajes', ruta: '/articulos?categoria=opinion' }
]

export const pieSitio: FooterLanding = {
  descripcion: 'Deportes, tecnología y tendencias con la jugada clara.',
  columnas: [
    { titulo: 'Navegación', enlaces: [{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Noticias', ruta: '/articulos' }] },
    { titulo: 'Categorías', enlaces: [{ etiqueta: 'Fútbol', ruta: '/articulos?categoria=futbol' }, { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' }, { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' }] }
  ]
}
