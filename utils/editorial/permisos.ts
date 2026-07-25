import type { PermisoEditorial, RolEditorial } from '~/types/editorial'

export const permisosEditoriales: PermisoEditorial[] = [
  'panel.acceder',
  'contenido.verBorradores',
  'contenido.crear',
  'contenido.editarPropio',
  'contenido.editarTodos',
  'contenido.enviarRevision',
  'contenido.revisar',
  'contenido.aprobar',
  'contenido.programar',
  'contenido.publicar',
  'contenido.archivar',
  'media.ver',
  'media.subir',
  'media.editar',
  'media.eliminar',
  'taxonomia.ver',
  'taxonomia.gestionar',
  'ingestas.ver',
  'ingestas.gestionar',
  'equipo.ver',
  'equipo.gestionar',
  'configuracion.ver',
  'configuracion.gestionar',
  'auditoria.ver'
]

export const rolesEditoriales: RolEditorial[] = [
  'propietario',
  'administrador',
  'editorJefe',
  'editor',
  'autor',
  'colaborador'
]

export const rolesConMfaObligatorio: RolEditorial[] = [
  'propietario',
  'administrador',
  'editorJefe'
]

export const etiquetasRolesEditoriales: Record<RolEditorial, string> = {
  propietario: 'Propietario',
  administrador: 'Administrador',
  editorJefe: 'Editor jefe',
  editor: 'Editor',
  autor: 'Autor',
  colaborador: 'Colaborador'
}

export const permisosPorRol: Record<RolEditorial, readonly PermisoEditorial[]> = {
  propietario: permisosEditoriales,
  administrador: permisosEditoriales,
  editorJefe: [
    'panel.acceder',
    'contenido.verBorradores',
    'contenido.crear',
    'contenido.editarPropio',
    'contenido.editarTodos',
    'contenido.enviarRevision',
    'contenido.revisar',
    'contenido.aprobar',
    'contenido.programar',
    'contenido.publicar',
    'contenido.archivar',
    'media.ver',
    'media.subir',
    'media.editar',
    'taxonomia.ver',
    'taxonomia.gestionar',
    'ingestas.ver'
  ],
  editor: [
    'panel.acceder',
    'contenido.verBorradores',
    'contenido.crear',
    'contenido.editarPropio',
    'contenido.editarTodos',
    'contenido.enviarRevision',
    'contenido.revisar',
    'media.ver',
    'media.subir',
    'media.editar',
    'taxonomia.ver',
    'ingestas.ver'
  ],
  autor: [
    'panel.acceder',
    'contenido.verBorradores',
    'contenido.crear',
    'contenido.editarPropio',
    'contenido.enviarRevision',
    'media.ver',
    'media.subir',
    'taxonomia.ver'
  ],
  colaborador: [
    'panel.acceder',
    'contenido.verBorradores',
    'contenido.crear',
    'contenido.editarPropio',
    'contenido.enviarRevision',
    'media.ver',
    'media.subir',
    'taxonomia.ver'
  ]
}

export function tienePermisoEditorial(
  permisos: readonly PermisoEditorial[],
  permiso: PermisoEditorial
): boolean {
  return permisos.includes(permiso)
}

export function requiereMfaEditorial(
  roles: readonly RolEditorial[],
  permisos: readonly PermisoEditorial[]
): boolean {
  return roles.some(rol => rolesConMfaObligatorio.includes(rol))
    || permisos.includes('contenido.publicar')
}

export function obtenerRolPrincipal(roles: readonly RolEditorial[]): RolEditorial | null {
  return rolesEditoriales.find(rol => roles.includes(rol)) || null
}
