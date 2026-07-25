import type { User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import type {
  ContextoEditorial,
  NivelAal,
  PermisoEditorial,
  RolEditorial
} from '~/types/editorial'
import { requiereMfaEditorial } from '~/utils/editorial/permisos'
import { obtenerClienteSupabaseEditorial } from './clienteSupabaseEditorial'

interface FilaRol {
  role: RolEditorial
}

interface FilaPermiso {
  permission: PermisoEditorial
}

interface FilaPerfil {
  display_name: string
}

function crearErrorConsulta(detalle: string) {
  return createError({
    statusCode: 503,
    statusMessage: 'No se pudo validar el acceso editorial.',
    data: {
      codigo: 'CONTEXTO_EDITORIAL_NO_DISPONIBLE',
      detalle
    }
  })
}

async function obtenerUsuarioVerificado(evento: H3Event): Promise<User> {
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  let respuesta

  try {
    respuesta = await clienteSupabase.auth.getUser()
  } catch {
    throw crearErrorConsulta('Supabase Auth no respondió.')
  }

  const { data, error } = respuesta

  if (error || !data.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Debes iniciar sesión.',
      data: { codigo: 'SESION_REQUERIDA' }
    })
  }

  return data.user
}

export async function obtenerContextoEditorialServidor(
  evento: H3Event
): Promise<ContextoEditorial> {
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const usuario = await obtenerUsuarioVerificado(evento)

  const { data: filasRoles, error: errorRoles } = await clienteSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', usuario.id)
    .eq('is_active', true)

  if (errorRoles) {
    throw crearErrorConsulta(errorRoles.message)
  }

  const roles = (filasRoles || []).map(fila => (fila as FilaRol).role)

  if (!roles.length) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu cuenta no tiene acceso al panel editorial.',
      data: { codigo: 'SIN_ROL_EDITORIAL' }
    })
  }

  const { data: filasPermisos, error: errorPermisos } = await clienteSupabase
    .from('editorial_role_permissions')
    .select('permission')
    .in('role', roles)

  if (errorPermisos) {
    throw crearErrorConsulta(errorPermisos.message)
  }

  const permisos = [...new Set(
    (filasPermisos || []).map(fila => (fila as FilaPermiso).permission)
  )]

  if (!permisos.includes('panel.acceder')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu rol no tiene permiso para acceder al panel.',
      data: { codigo: 'PERMISO_PANEL_REQUERIDO' }
    })
  }

  const [
    { data: perfil },
    { data: nivelAutenticacion }
  ] = await Promise.all([
    clienteSupabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', usuario.id)
      .maybeSingle(),
    clienteSupabase.auth.mfa.getAuthenticatorAssuranceLevel()
  ])

  return {
    usuario: {
      id: usuario.id,
      correo: usuario.email || '',
      nombre: (perfil as FilaPerfil | null)?.display_name
        || String(usuario.user_metadata?.nombreCompleto || usuario.email || 'Equipo Pont3la10')
    },
    roles,
    permisos,
    nivelAal: (nivelAutenticacion?.currentLevel || null) as NivelAal,
    siguienteNivelAal: (nivelAutenticacion?.nextLevel || null) as NivelAal,
    requiereMfa: requiereMfaEditorial(roles, permisos)
  }
}

export async function exigirPermisoEditorial(
  evento: H3Event,
  permiso: PermisoEditorial,
  opciones: { exigirMfa?: boolean } = {}
): Promise<ContextoEditorial> {
  const contexto = await obtenerContextoEditorialServidor(evento)

  if (!contexto.permisos.includes(permiso)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No tienes permiso para realizar esta acción.',
      data: { codigo: 'PERMISO_EDITORIAL_REQUERIDO', permiso }
    })
  }

  if (opciones.exigirMfa && contexto.nivelAal !== 'aal2') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Esta acción requiere verificación en dos pasos.',
      data: { codigo: 'MFA_REQUERIDO' }
    })
  }

  return contexto
}
