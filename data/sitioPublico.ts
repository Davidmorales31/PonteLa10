import type { IdSitio } from '~/utils/sitio'
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
  { etiqueta: 'Especiales', icono: 'balon', ruta: '/especiales' },
  { etiqueta: 'Opinión', icono: 'mensajes', ruta: '/articulos?categoria=opinion' }
]

export const pieSitio: FooterLanding = {
  descripcion: 'Deportes, tecnología y tendencias con la jugada clara.',
  columnas: [
    { titulo: 'Navegación', enlaces: [{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Noticias', ruta: '/articulos' }, { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' }, { etiqueta: 'Resultados', ruta: '/resultados' }, { etiqueta: 'Liga colombiana', ruta: '/liga-colombiana' }, { etiqueta: 'Selección Colombia', ruta: '/seleccion-colombia' }] },
    { titulo: 'Categorías', enlaces: [{ etiqueta: 'Fútbol colombiano', ruta: '/futbol-colombiano' }, { etiqueta: 'Fútbol internacional', ruta: '/futbol-internacional' }, { etiqueta: 'Colombianos en Europa', ruta: '/colombianos-en-europa' }] },
    { titulo: 'Transparencia y legal', enlaces: [{ etiqueta: 'Quiénes somos', ruta: '/quienes-somos' }, { etiqueta: 'Equipo editorial', ruta: '/autores/equipo-pont3la10' }, { etiqueta: 'Política editorial', ruta: '/politica-editorial' }, { etiqueta: 'Correcciones', ruta: '/correcciones' }, { etiqueta: 'Términos y condiciones', ruta: '/terminos' }, { etiqueta: 'Privacidad', ruta: '/privacidad' }] }
  ]
}

// México: solo enlaza páginas que ya funcionan para ese sitio. Liga MX, Selección Mexicana
// y Mexicanos en el exterior se agregan cuando existan sus páginas y datos (fases 4 y 5).
const navegacionMexico: ItemNavegacionLanding[] = [
  { etiqueta: 'Inicio', ruta: '/', exacta: true },
  { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' },
  { etiqueta: 'Liga MX', ruta: '/liga-mx' },
  { etiqueta: 'Selección Mexicana', ruta: '/seleccion-mexicana' },
  { etiqueta: 'Mexicanos en el exterior', ruta: '/mexicanos-en-el-exterior' },
  { etiqueta: 'Resultados', ruta: '/resultados' },
  { etiqueta: 'Noticias', ruta: '/articulos' }
]

const navegacionMasMexico: ItemNavegacionLanding[] = [
  { etiqueta: 'Fútbol mexicano', ruta: '/futbol-mexicano' },
  { etiqueta: 'Clubes', ruta: '/clubes' },
  { etiqueta: 'Fútbol internacional', ruta: '/futbol-internacional' },
  { etiqueta: 'Especiales', ruta: '/especiales' },
  { etiqueta: 'Tech deportiva', ruta: '/articulos?categoria=tecnologia' },
  { etiqueta: 'Gaming', ruta: '/articulos?categoria=gaming' },
  { etiqueta: 'Tendencias', ruta: '/articulos?categoria=tendencias' },
  { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion' }
]

const categoriasMexico: CategoriaLanding[] = [
  { etiqueta: 'Fútbol mexicano', icono: 'balon', ruta: '/futbol-mexicano' },
  ...categoriasSitio.filter(categoria => categoria.variante !== 'colombia')
]

const pieMexico: FooterLanding = {
  descripcion: 'Liga MX, Selección Mexicana, deportes y tendencias con la jugada clara.',
  columnas: [
    { titulo: 'Navegación', enlaces: [{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Noticias', ruta: '/articulos' }, { etiqueta: 'Partidos de hoy', ruta: '/partidos-hoy' }, { etiqueta: 'Liga MX', ruta: '/liga-mx' }, { etiqueta: 'Selección Mexicana', ruta: '/seleccion-mexicana' }, { etiqueta: 'Resultados', ruta: '/resultados' }] },
    { titulo: 'Categorías', enlaces: [{ etiqueta: 'Fútbol mexicano', ruta: '/futbol-mexicano' }, { etiqueta: 'Mexicanos en el exterior', ruta: '/mexicanos-en-el-exterior' }, { etiqueta: 'Fútbol internacional', ruta: '/futbol-internacional' }, { etiqueta: 'Especiales', ruta: '/especiales' }] },
    // Las páginas legales y editoriales son comunes a los dos sitios.
    pieSitio.columnas[2]!
  ]
}

export function navegacionDe(sitio: IdSitio): ItemNavegacionLanding[] {
  return sitio === 'mx' ? navegacionMexico : navegacionSitio
}

export function navegacionMasDe(sitio: IdSitio): ItemNavegacionLanding[] {
  return sitio === 'mx' ? navegacionMasMexico : navegacionMasSitio
}

export function categoriasDe(sitio: IdSitio): CategoriaLanding[] {
  return sitio === 'mx' ? categoriasMexico : categoriasSitio
}

export function pieDe(sitio: IdSitio): FooterLanding {
  return sitio === 'mx' ? pieMexico : pieSitio
}
