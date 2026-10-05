import { describe, expect, it } from 'vitest'
import {
  contarPalabrasEditoriales,
  cumplePortadaPropuestaCodex,
  cumpleMinimoLecturaCodex,
  PALABRAS_MINIMAS_ARTICULO_CODEX
} from '../../scripts/codex-editorial-contract.mjs'

describe('contrato de extensión de propuestas Codex', () => {
  it('cuenta palabras del cuerpo normalizando espacios y saltos de línea', () => {
    expect(contarPalabrasEditoriales('  primera\n segunda   tercera ')).toBe(3)
  })

  it('exige 660 palabras en el cuerpo, sin contar metadatos', () => {
    expect(PALABRAS_MINIMAS_ARTICULO_CODEX).toBe(660)
    expect(cumpleMinimoLecturaCodex(Array(660).fill('palabra').join(' '))).toBe(true)
    expect(cumpleMinimoLecturaCodex(Array(659).fill('palabra').join(' '))).toBe(false)
    expect(cumpleMinimoLecturaCodex('')).toBe(false)
  })

  it('permite omitir la portada y valida la marca cuando existe una', () => {
    const base = { coverMediaId: 'ed2af2d4-533e-4dab-9e9d-a48268297220', editorialFlags: [] as string[] }
    expect(cumplePortadaPropuestaCodex({ ...base, editorialFlags: ['ai_generated_cover'] })).toBe(true)
    expect(cumplePortadaPropuestaCodex({ ...base, editorialFlags: ['licensed_photo_cover'] })).toBe(true)
    expect(cumplePortadaPropuestaCodex({ ...base, coverMediaId: null, editorialFlags: [] })).toBe(true)
    expect(cumplePortadaPropuestaCodex({ ...base, coverMediaId: null, editorialFlags: ['licensed_photo_cover'] })).toBe(false)
    expect(cumplePortadaPropuestaCodex({ ...base, coverMediaId: null, editorialFlags: ['ai_generated_cover'] })).toBe(false)
    expect(cumplePortadaPropuestaCodex({ ...base, editorialFlags: [] })).toBe(false)
    expect(cumplePortadaPropuestaCodex({ ...base, editorialFlags: ['ai_generated_cover', 'licensed_photo_cover'] })).toBe(false)
  })
})
