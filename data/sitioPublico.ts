import type {
  CategoriaLanding,
  FooterLanding,
  ItemNavegacionLanding
} from '~/types/landing'

export const navegacionSitio: ItemNavegacionLanding[] = [
  { etiqueta: 'Inicio', ruta: '/', exacta: true },
  { etiqueta: 'Noticias', ruta: '/articulos' },
  { etiqueta: 'Resultados', ruta: '/resultados' },
  { etiqueta: 'Especiales', ruta: '/especiales' },
  { etiqueta: 'Fútbol', ruta: '/articulos?categoria=futbol' },
]

export const navegacionMasSitio: ItemNavegacionLanding[] = [
  { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Gaming', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion' }
]

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
