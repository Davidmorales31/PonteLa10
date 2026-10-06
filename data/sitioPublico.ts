import type {
  CategoriaLanding,
  FooterLanding,
  ItemNavegacionLanding
} from '~/types/landing'

export const navegacionSitio: ItemNavegacionLanding[] = [
  { etiqueta: 'Inicio', ruta: '/', exacta: true },
  { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
  { etiqueta: 'Liga colombiana', ruta: '/liga-colombiana' },
  { etiqueta: 'Selección Colombia', ruta: '/seleccion-colombia' },
  { etiqueta: 'Colombianos en Europa', ruta: '/colombianos-en-europa' },
  { etiqueta: 'Resultados', ruta: '/resultados' },
  { etiqueta: 'Noticias', ruta: '/articulos' }
]

export const navegacionMasSitio: ItemNavegacionLanding[] = [
  { etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano' },
  { etiqueta: 'Fútbol internacional', ruta: '/futbol-internacional' },
  { etiqueta: 'Especiales', ruta: '/especiales' },
  { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Gaming', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion' }
]

export const categoriasSitio: CategoriaLanding[] = [
  { etiqueta: 'Fútbol mundial', icono: 'balon', ruta: '/futbol-internacional' },
  { etiqueta: 'Fútbol colombiano', icono: 'banderaColombia', ruta: '/futbol-colombiano', variante: 'colombia' },
  { etiqueta: 'Tech deportiva', icono: 'chip', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Gaming deportivo', icono: 'control', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Tendencias', icono: 'tendencia', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Opinión', icono: 'mensajes', ruta: '/articulos?categoria=opinion' }
]

export const pieSitio: FooterLanding = {
  descripcion: 'Deportes, tecnología y tendencias con la jugada clara.',
  columnas: [
    { titulo: 'Navegación', enlaces: [{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Noticias', ruta: '/articulos' }, { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' }, { etiqueta: 'Resultados', ruta: '/resultados' }, { etiqueta: 'Liga colombiana', ruta: '/liga-colombiana' }, { etiqueta: 'Selección Colombia', ruta: '/seleccion-colombia' }] },
    { titulo: 'Categorías', enlaces: [{ etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano' }, { etiqueta: 'Fútbol internacional', ruta: '/futbol-internacional' }, { etiqueta: 'Colombianos en Europa', ruta: '/colombianos-en-europa' }] },
    { titulo: 'Legal', enlaces: [{ etiqueta: 'Términos y condiciones', ruta: '/terminos' }, { etiqueta: 'Privacidad', ruta: '/privacidad' }] }
  ]
}
