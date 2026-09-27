export const PALABRAS_MINIMAS_ARTICULO_CODEX = 660

export function contarPalabrasEditoriales(texto) {
  const normalizado = String(texto || '').trim()
  return normalizado ? normalizado.split(/\s+/).length : 0
}

export function cumpleMinimoLecturaCodex(texto) {
  return contarPalabrasEditoriales(texto) >= PALABRAS_MINIMAS_ARTICULO_CODEX
}
