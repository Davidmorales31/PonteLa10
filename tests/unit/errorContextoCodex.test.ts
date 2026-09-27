import { describe, expect, it } from 'vitest'
import { clasificarErrorContextoCodex } from '../../server/utils/errorContextoCodex'

describe('clasificación segura de errores del contexto Codex', () => {
  it('expone un conflicto de fecha estable sin filtrar el error SQL', () => {
    expect(clasificarErrorContextoCodex({
      code: '22023',
      message: 'La corrida editorial pertenece a otra fecha. detalle privado'
    })).toEqual({
      statusCode: 409,
      statusMessage: 'La corrida editorial pertenece a otra fecha.',
      codigo: 'CORRIDA_CODEX_FECHA_DISTINTA'
    })
  })

  it('mantiene genéricos otros errores del RPC', () => {
    expect(clasificarErrorContextoCodex({
      code: '57014', message: 'canceling statement due to timeout'
    })).toEqual({
      statusCode: 502,
      statusMessage: 'No se pudo cargar el contexto editorial actual.',
      codigo: 'CONTEXTO_CODEX_NO_DISPONIBLE'
    })
  })
})
