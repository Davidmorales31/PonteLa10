// Ediciones del video diario: la misma herramienta sirve para el resumen del fútbol colombiano (la edición por
// defecto) y para el del fútbol internacional. Un guion declara su edición con `"edicion": "internacional"`; sin ese
// campo, es la edición de Colombia y nada cambia respecto a lo que ya existía.
// Lógica pura, sin disco: la usan el generador, el buscador de fotos, las descripciones y los Reels.

export const EDICIONES = {
  colombia: {
    id: 'colombia',
    nombre: 'Fútbol colombiano',
    sufijoCarpeta: '',
    kicker: 'NOTICIAS DEL FÚTBOL COLOMBIANO',
    categoria: 'futbol-colombiano',
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
    cierreDescripcion: 'Suscríbete y activa la campana para el resumen diario del fútbol internacional.',
    hashtags: ['#FutbolInternacional', '#Champions', '#Pont3la10'],
    hashtagReel: '#FutbolInternacional'
  }
}

/** Edición de un guion (del video largo o de un Reel). Cualquier valor desconocido cae en Colombia. */
export function edicionDe(guion) {
  const id = String(guion?.edicion || '').trim().toLowerCase()
  return EDICIONES[id] || EDICIONES.colombia
}

/** Nombre de la carpeta del proyecto en videos/diario: `<fecha>` para Colombia y `<fecha>-internacional` para la otra. */
export function nombreProyecto(guion) {
  const fecha = String(guion?.fecha || 'sin-fecha')
  const { sufijoCarpeta } = edicionDe(guion)
  return sufijoCarpeta ? `${fecha}-${sufijoCarpeta}` : fecha
}
