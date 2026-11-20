// Jerarquía de proyectos del estudio: el video del día es el proyecto principal y sus Reels con guion propio
// (`<fecha>-reel-1`, `<fecha>-reel-2`…) son subproyectos suyos. Lo que sigue es lógica pura, sin disco.

const HIJO = /^(\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]{1,30}?)?)-reel-(\d{1,3})$/

/** Nombre del proyecto principal de un subproyecto Reel (null si el nombre no es de un Reel con guion propio). */
export function nombrePadre(nombre) {
  const m = HIJO.exec(String(nombre || ''))
  return m ? m[1] : null
}

/** Número de un subproyecto Reel (`…-reel-3` → 3). */
export const numeroDeReel = nombre => Number(HIJO.exec(String(nombre || ''))?.[2]) || 0

/** Subproyectos Reel de un proyecto principal, en orden numérico. */
export function hijosDe(raiz, nombres) {
  return nombres.filter(n => nombrePadre(n) === raiz).sort((a, b) => numeroDeReel(a) - numeroDeReel(b))
}

/** Raíz de la familia: el padre si el proyecto es un subproyecto cuyo principal existe; si no, él mismo. */
export function raizDeFamilia(nombre, nombres) {
  const padre = nombrePadre(nombre)
  return padre && nombres.includes(padre) ? padre : nombre
}

/**
 * Lista única de Reels de la familia: primero los de guion propio (en orden), después los cortes del video principal.
 * `propios` y `cortes` ya traen su proyecto dueño; los de guion propio sin renderizar salen como «pendientes».
 */
export function listaDeReels({ cortes = [], hijos = [] }) {
  return [
    ...hijos.map(h => ({ origen: 'guion', ...h })),
    ...cortes.map(c => ({ origen: 'video', listo: true, ...c }))
  ]
}
