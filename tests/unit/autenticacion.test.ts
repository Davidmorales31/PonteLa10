import { describe, expect, it } from 'vitest'
import {
  esquemaCambioContrasenaAuth,
  esquemaCredencialesIngreso,
  esquemaRegistroEditorial,
  esquemaSolicitudCorreoAuth,
  obtenerPrimerErrorAuth
} from '~/utils/validation/autenticacion'

describe('validaciones de autenticacion editorial', () => {
  it('acepta credenciales validas para ingreso', () => {
    const resultado = esquemaCredencialesIngreso.safeParse({
      correo: 'editor@pont3la10.com',
      contrasena: 'claveSegura'
    })

    expect(resultado.success).toBe(true)
  })

  it('rechaza correos invalidos', () => {
    const resultado = esquemaSolicitudCorreoAuth.safeParse({
      correo: 'correo-invalido'
    })

    expect(resultado.success).toBe(false)
    expect(obtenerPrimerErrorAuth(resultado)).toBe('Ingresa un correo válido.')
  })

  it('exige contrasena fuerte al crear acceso', () => {
    const resultado = esquemaRegistroEditorial.safeParse({
      nombreCompleto: 'Editor Pont3la10',
      correo: 'editor@pont3la10.com',
      contrasena: 'debil'
    })

    expect(resultado.success).toBe(false)
    expect(obtenerPrimerErrorAuth(resultado)).toBe('La contraseña debe tener mínimo 10 caracteres.')
  })

  it('acepta contrasena fuerte para actualizacion', () => {
    const resultado = esquemaCambioContrasenaAuth.safeParse({
      contrasena: 'Pont3la10Seguro'
    })

    expect(resultado.success).toBe(true)
  })
})
