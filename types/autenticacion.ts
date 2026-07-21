import type { User } from '@supabase/supabase-js'

export type ModoLoginEditorial = 'ingreso' | 'registro' | 'recuperacion' | 'actualizarContrasena'

export type EstadoSolicitudAuth = 'idle' | 'cargando' | 'exito' | 'error'

export interface CredencialesIngreso {
  correo: string
  contrasena: string
}

export interface RegistroEditorial extends CredencialesIngreso {
  nombreCompleto: string
}

export interface SolicitudCorreoAuth {
  correo: string
}

export interface CambioContrasenaAuth {
  contrasena: string
}

export interface ResultadoOperacionAuth {
  correcto: boolean
  titulo: string
  detalle: string
}

export type UsuarioEditorial = User
