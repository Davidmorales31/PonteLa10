import type { ResultadoOperacionAuth } from '~/types/autenticacion'

const mensajesAuth: Record<string, string> = {
  'invalid login credentials': 'El correo o la contraseña no coinciden.',
  'email not confirmed': 'Confirma tu correo antes de entrar.',
  'user already registered': 'Este correo ya tiene una cuenta.',
  'signup disabled': 'El registro está cerrado. Pide acceso al equipo interno.',
  'rate limit': 'Demasiados intentos. Espera un momento y vuelve a probar.'
}

export function crearResultadoAuth(
  correcto: boolean,
  titulo: string,
  detalle: string
): ResultadoOperacionAuth {
  return { correcto, titulo, detalle }
}

export function normalizarMensajeAuth(mensaje?: string): string {
  if (!mensaje) {
    return 'No pudimos completar la solicitud. Intenta de nuevo.'
  }

  const mensajeNormalizado = mensaje.toLowerCase()
  const claveMensaje = Object.keys(mensajesAuth).find((clave) => mensajeNormalizado.includes(clave))

  return claveMensaje ? mensajesAuth[claveMensaje] : 'No pudimos completar la solicitud. Intenta de nuevo.'
}
