import { z } from 'zod'

export const esquemaCorreoAuth = z
  .string()
  .trim()
  .email('Ingresa un correo valido.')
  .max(180, 'El correo es demasiado largo.')

export const esquemaContrasenaAuth = z
  .string()
  .min(10, 'La contrasena debe tener minimo 10 caracteres.')
  .max(96, 'La contrasena es demasiado larga.')
  .regex(/[A-Z]/, 'Incluye al menos una mayuscula.')
  .regex(/[a-z]/, 'Incluye al menos una minuscula.')
  .regex(/[0-9]/, 'Incluye al menos un numero.')

export const esquemaCredencialesIngreso = z.object({
  correo: esquemaCorreoAuth,
  contrasena: z.string().min(8, 'Ingresa tu contrasena.')
})

export const esquemaRegistroEditorial = z.object({
  nombreCompleto: z.string().trim().min(3, 'Ingresa tu nombre completo.').max(120),
  correo: esquemaCorreoAuth,
  contrasena: esquemaContrasenaAuth
})

export const esquemaSolicitudCorreoAuth = z.object({
  correo: esquemaCorreoAuth
})

export const esquemaCambioContrasenaAuth = z.object({
  contrasena: esquemaContrasenaAuth
})

export function obtenerPrimerErrorAuth(resultado: { success: boolean, error?: z.ZodError }): string {
  if (resultado.success || !resultado.error) {
    return ''
  }

  return resultado.error.issues[0]?.message || 'Revisa los datos e intenta de nuevo.'
}
