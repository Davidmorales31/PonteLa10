import { describe, expect, it } from 'vitest'
import { fechaParaCampoLocal } from '~/utils/editorial/fechaProgramacion'

describe('fechaParaCampoLocal', () => {
  it('conserva la hora local que debe mostrar datetime-local', () => {
    const original = Date.prototype.getTimezoneOffset
    Date.prototype.getTimezoneOffset = () => 300

    expect(fechaParaCampoLocal(new Date('2026-09-24T03:27:00.000Z')))
      .toBe('2026-09-23T22:27')

    Date.prototype.getTimezoneOffset = original
  })
})
