// Ediciones del video diario: la misma herramienta sirve para el resumen de Latinoamérica (Colombia incluida), el del
// fútbol internacional y el de solo Colombia (la edición histórica, que sigue siendo la de los guiones sin campo).
// Un guion declara su edición con `"edicion": "latam"` o `"edicion": "internacional"`; sin ese campo, es la edición de
// Colombia y nada cambia respecto a lo que ya existía.
// Lógica pura, sin disco: la usan el generador, el buscador de fotos, las descripciones y los Reels.

export const EDICIONES = {
  colombia: {
    id: 'colombia',
    nombre: 'Fútbol colombiano',
    sufijoCarpeta: '',
    kicker: 'NOTICIAS DEL FÚTBOL COLOMBIANO',
    categoria: 'futbol-colombiano',
    categorias: ['futbol-colombiano'],
    consultaRespaldo: 'estadio fútbol Colombia hinchas',
    cierreDescripcion: 'Suscríbete y activa la campana para el resumen diario del fútbol colombiano.',
    hashtags: ['#FutbolColombiano', '#LigaBetPlay', '#Pont3la10'],
    hashtagReel: '#FutbolColombiano'
  },
  internacional: {
    id: 'internacional',
    nombre: 'Fútbol internacional',
    sufijoCarpeta: 'internacional',
    kicker: 'NOTICIAS DEL FÚTBOL INTERNACIONAL',
    categoria: 'futbol-mundial',
    categorias: ['futbol-mundial'],
    consultaRespaldo: 'estadio fútbol hinchas',
    cierreDescripcion: 'Suscríbete y activa la campana para el resumen diario del fútbol internacional.',
    hashtags: ['#FutbolInternacional', '#Champions', '#Pont3la10'],
    hashtagReel: '#FutbolInternacional'
  },
  // Latinoamérica: Colombia entra como un país más (con el mayor peso, porque es de donde hay más fuentes). No hay una
  // corrida propia: sus notas son las de futbol-colombiano más las de futbol-mundial que nombran la región
  // (scripts/video-latam.mjs y config/fuentesFutbolLatam.json). México vive en mx.pont3la10.com (aún sin lanzar).
  latam: {
    id: 'latam',
    nombre: 'Fútbol latinoamericano',
    sufijoCarpeta: 'latam',
    kicker: 'NOTICIAS DEL FÚTBOL LATINOAMERICANO',
    categoria: 'futbol-colombiano',
    categorias: ['futbol-colombiano', 'futbol-mundial'],
    consultaRespaldo: 'estadio fútbol Latinoamérica hinchas',
    cierreDescripcion: 'Suscríbete y activa la campana para el resumen diario del fútbol de Latinoamérica.',
    hashtags: ['#FutbolLatinoamericano', '#Libertadores', '#Pont3la10'],
    hashtagReel: '#FutbolLatinoamericano'
  }
}

/** Edición de un guion (del video largo o de un Reel). Cualquier valor desconocido cae en Colombia. */
export function edicionDe(guion) {
  const id = String(guion?.edicion || '').trim().toLowerCase()
  return EDICIONES[id] || EDICIONES.colombia
}

/** Nombre de la carpeta del proyecto en videos/diario: `<fecha>` para Colombia; `<fecha>-latam` y `<fecha>-internacional` para las otras. */
export function nombreProyecto(guion) {
  const fecha = String(guion?.fecha || 'sin-fecha')
  const { sufijoCarpeta } = edicionDe(guion)
  return sufijoCarpeta ? `${fecha}-${sufijoCarpeta}` : fecha
}
