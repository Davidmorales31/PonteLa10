import { describe, expect, it } from 'vitest'
import { analizarTextoX } from '~/server/utils/validacionTextoX'

describe('conteo de texto según X', () => {
  it('cuenta enlaces con el peso estándar y acepta hasta el máximo', () => {
    const texto = `${'a'.repeat(256)} https://x.co`
    expect(analizarTextoX(texto)).toEqual({ valido: true, longitud: 280, limite: 280 })
  })
  it('rechaza texto vacío o que supera el límite ponderado', () => {
    expect(analizarTextoX('').valido).toBe(false)
    expect(analizarTextoX('a'.repeat(281))).toMatchObject({ valido: false, longitud: 281 })
  })
  it('aplica el peso de caracteres Unicode y emoji del algoritmo oficial', () => {
    expect(analizarTextoX('⚽'.repeat(141))).toMatchObject({ valido: false, longitud: 282 })
  })
})
