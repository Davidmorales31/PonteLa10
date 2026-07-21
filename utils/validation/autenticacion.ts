import { z } from 'zod'

export const esquemaCorreoAuth = z
  .string()
  .trim()
  .email('Ingresa un correo válido.')
  .max(180, 'El correo es demasiado largo.')

export const esquemaContrasenaAuth = z
  .string()
  .min(10, 'La contraseña debe tener mínimo 10 caracteres.')
  .max(96, 'La contraseña es demasiado larga.')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula.')
  .regex(/[a-z]/, 'Incluye al menos una minúscula.')
  .regex(/[0-9]/, 'Incluye al menos un número.')

export const esquemaCredencialesIngreso = z.object({
  correo: esquemaCorreoAuth,
  contrasena: z.string().min(8, 'Ingresa tu contraseña.')
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
