export const PALABRAS_MINIMAS_ARTICULO_CODEX = 660

export function contarPalabrasEditoriales(texto) {
  const normalizado = String(texto || '').trim()
  return normalizado ? normalizado.split(/\s+/).length : 0
}

export function cumpleMinimoLecturaCodex(texto) {
  return contarPalabrasEditoriales(texto) >= PALABRAS_MINIMAS_ARTICULO_CODEX
}

export function cumplePortadaPropuestaCodex(propuesta) {
  const mediaId = propuesta?.coverMediaId
  const flags = Array.isArray(propuesta?.editorialFlags) ? propuesta.editorialFlags : []
  const esFotoLicenciada = flags.includes('licensed_photo_cover')
  const esImagenIA = flags.includes('ai_generated_cover')

  if (mediaId === null) {
    return !esFotoLicenciada && !esImagenIA
  }

  const tienePortada = typeof mediaId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)

  return tienePortada && esFotoLicenciada !== esImagenIA
}
