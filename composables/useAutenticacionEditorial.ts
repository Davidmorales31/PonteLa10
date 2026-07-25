import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js'
import type {
  CambioContrasenaAuth,
  CredencialesIngreso,
  RegistroEditorial,
  ResultadoOperacionAuth,
  SolicitudCorreoAuth,
  UsuarioEditorial
} from '~/types/autenticacion'
import {
  esquemaCambioContrasenaAuth,
  esquemaCredencialesIngreso,
  esquemaRegistroEditorial,
  esquemaSolicitudCorreoAuth,
  obtenerPrimerErrorAuth
} from '~/utils/validation/autenticacion'
import { crearResultadoAuth, normalizarMensajeAuth } from '~/utils/auth/mensajesAutenticacion'
import { normalizarRedireccionInterna } from '~/utils/auth/redirecciones'

interface NuxtAppConSupabase {
  $clienteSupabase?: SupabaseClient | null
}

function obtenerClienteSupabase(): SupabaseClient | null {
  const aplicacion = useNuxtApp() as NuxtAppConSupabase

  return aplicacion.$clienteSupabase || null
}

function obtenerUrlRetornoAuth(rutaDestino = '/'): string {
  const config = useRuntimeConfig()
  const origen = import.meta.client ? window.location.origin : String(config.public.siteUrl)
  const rutaSegura = normalizarRedireccionInterna(rutaDestino)

  return `${origen}/login?redirigir=${encodeURIComponent(rutaSegura)}`
}

function obtenerUrlCambioContrasena(): string {
  const config = useRuntimeConfig()
  const origen = import.meta.client ? window.location.origin : String(config.public.siteUrl)

  return `${origen}/login?modo=actualizarContrasena`
}

function manejarErrorAuth(error: AuthError | Error | null): ResultadoOperacionAuth {
  return crearResultadoAuth(false, 'No se pudo autenticar', normalizarMensajeAuth(error?.message))
}

export function useAutenticacionEditorial() {
  const config = useRuntimeConfig()
  const clienteSupabase = obtenerClienteSupabase()
  const cargandoAuth = useState('auth:cargando', () => false)
  const usuarioActual = useState<UsuarioEditorial | null>('auth:usuarioActual', () => null)
  const sesionActual = useState<Session | null>('auth:sesionActual', () => null)
  const autenticacionConfigurada = computed(() => Boolean(config.public.supabaseUrl && config.public.supabaseKey))

  async function obtenerSesionActual(): Promise<Session | null> {
    if (!clienteSupabase) {
      usuarioActual.value = null
      sesionActual.value = null
      return null
    }

    const { data, error } = await clienteSupabase.auth.getSession()

    if (error) {
      usuarioActual.value = null
      sesionActual.value = null
      return null
    }

    usuarioActual.value = data.session?.user || null
    sesionActual.value = data.session || null

    return data.session
  }

  async function iniciarSesionCorreo(credenciales: CredencialesIngreso): Promise<ResultadoOperacionAuth> {
    const validacion = esquemaCredencialesIngreso.safeParse(credenciales)

    if (!validacion.success) {
      return crearResultadoAuth(false, 'Revisa los datos', obtenerPrimerErrorAuth(validacion))
    }

    if (!clienteSupabase) {
      return crearResultadoAuth(false, 'Falta configuración', 'Supabase Auth no está configurado en este entorno.')
    }

    cargandoAuth.value = true
    const { data, error } = await clienteSupabase.auth.signInWithPassword({
      email: validacion.data.correo,
      password: validacion.data.contrasena
    })
    cargandoAuth.value = false

    if (error) {
      return manejarErrorAuth(error)
    }

    usuarioActual.value = data.user
    sesionActual.value = data.session

    return crearResultadoAuth(true, 'Sesión iniciada', 'Bienvenido a Pont3la10.')
  }

  async function registrarUsuarioCorreo(registro: RegistroEditorial): Promise<ResultadoOperacionAuth> {
    const validacion = esquemaRegistroEditorial.safeParse(registro)

    if (!validacion.success) {
      return crearResultadoAuth(false, 'Revisa los datos', obtenerPrimerErrorAuth(validacion))
    }

    if (!clienteSupabase) {
      return crearResultadoAuth(false, 'Falta configuración', 'Supabase Auth no está configurado en este entorno.')
    }

    cargandoAuth.value = true
    const { error } = await clienteSupabase.auth.signUp({
      email: validacion.data.correo,
      password: validacion.data.contrasena,
      options: {
        data: {
          nombreCompleto: validacion.data.nombreCompleto
        },
        emailRedirectTo: obtenerUrlRetornoAuth('/')
      }
    })
    cargandoAuth.value = false

    if (error) {
      return manejarErrorAuth(error)
    }

    return crearResultadoAuth(true, 'Revisa tu correo', 'Te enviamos la confirmación para activar tu cuenta.')
  }

  async function recuperarContrasena(solicitud: SolicitudCorreoAuth): Promise<ResultadoOperacionAuth> {
    const validacion = esquemaSolicitudCorreoAuth.safeParse(solicitud)

    if (!validacion.success) {
      return crearResultadoAuth(false, 'Revisa el correo', obtenerPrimerErrorAuth(validacion))
    }

    if (!clienteSupabase) {
      return crearResultadoAuth(false, 'Falta configuración', 'Supabase Auth no está configurado en este entorno.')
    }

    cargandoAuth.value = true
    const { error } = await clienteSupabase.auth.resetPasswordForEmail(validacion.data.correo, {
      redirectTo: obtenerUrlCambioContrasena()
    })
    cargandoAuth.value = false

    if (error) {
      return manejarErrorAuth(error)
    }

    return crearResultadoAuth(true, 'Correo enviado', 'Te enviamos el enlace para cambiar tu contraseña.')
  }

  async function actualizarContrasena(cambio: CambioContrasenaAuth): Promise<ResultadoOperacionAuth> {
    const validacion = esquemaCambioContrasenaAuth.safeParse(cambio)

    if (!validacion.success) {
      return crearResultadoAuth(false, 'Revisa la contraseña', obtenerPrimerErrorAuth(validacion))
    }

    if (!clienteSupabase) {
      return crearResultadoAuth(false, 'Falta configuración', 'Supabase Auth no está configurado en este entorno.')
    }

    cargandoAuth.value = true
    const { error } = await clienteSupabase.auth.updateUser({
      password: validacion.data.contrasena
    })
    cargandoAuth.value = false

    if (error) {
      return manejarErrorAuth(error)
    }

    return crearResultadoAuth(true, 'Contraseña actualizada', 'Ya puedes entrar con tu nueva contraseña.')
  }

  async function iniciarSesionGoogle(): Promise<ResultadoOperacionAuth> {
    if (!clienteSupabase) {
      return crearResultadoAuth(false, 'Falta configuración', 'Supabase Auth no está configurado en este entorno.')
    }

    cargandoAuth.value = true
    const { error } = await clienteSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: obtenerUrlRetornoAuth('/')
      }
    })
    cargandoAuth.value = false

    if (error) {
      return manejarErrorAuth(error)
    }

    return crearResultadoAuth(true, 'Redirigiendo', 'Continua con Google para entrar a Pont3la10.')
  }

  async function cerrarSesion(): Promise<void> {
    if (clienteSupabase) {
      await clienteSupabase.auth.signOut()
    }

    usuarioActual.value = null
    sesionActual.value = null
  }

  return {
    autenticacionConfigurada,
    cargandoAuth,
    usuarioActual,
    sesionActual,
    obtenerSesionActual,
    iniciarSesionCorreo,
    registrarUsuarioCorreo,
    recuperarContrasena,
    actualizarContrasena,
    iniciarSesionGoogle,
    cerrarSesion
  }
}
