import { describe, expect, it } from 'vitest'
import { crearResultadoAuth, normalizarMensajeAuth } from '~/utils/auth/mensajesAutenticacion'

describe('mensajes de autenticacion editorial', () => {
  it('traduce credenciales invalidas sin filtrar mensajes tecnicos', () => {
    expect(normalizarMensajeAuth('Invalid login credentials')).toBe('El correo o la contraseña no coinciden.')
  })

  it('mantiene un mensaje generico para errores desconocidos', () => {
    expect(normalizarMensajeAuth('unexpected provider failure')).toBe(
      'No pudimos completar la solicitud. Intenta de nuevo.'
    )
  })

  it('crea resultados consistentes para la UI', () => {
    expect(crearResultadoAuth(true, 'Listo', 'Operacion completada')).toEqual({
      correcto: true,
      titulo: 'Listo',
      detalle: 'Operacion completada'
    })
  })
})
