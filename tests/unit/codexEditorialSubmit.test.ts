import { describe, expect, it } from 'vitest'
import {
  contarPalabrasEditoriales,
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
})
