export interface ArticuloResumen {
  slug: string
  titulo: string
  bajada: string
  categoria: string
  autor: string
  publicadoHace: string
  lecturaMinutos: number
  imagen: string
  destacado?: boolean
}

export interface ModuloInteractivo {
  slug: string
  nombre: string
  resumen: string
  estado: string
}

export interface TendenciaEditorial {
  posicion: number
  titulo: string
  categoria: string
}

export type RolEditorial =
  | 'propietario'
  | 'administrador'
  | 'editorJefe'
  | 'editor'
  | 'autor'
  | 'colaborador'

export type PermisoEditorial =
  | 'panel.acceder'
  | 'contenido.verBorradores'
  | 'contenido.crear'
  | 'contenido.editarPropio'
  | 'contenido.editarTodos'
  | 'contenido.enviarRevision'
  | 'contenido.revisar'
  | 'contenido.aprobar'
  | 'contenido.programar'
  | 'contenido.publicar'
  | 'contenido.archivar'
  | 'media.ver'
  | 'media.subir'
  | 'media.editar'
  | 'media.eliminar'
  | 'taxonomia.ver'
  | 'taxonomia.gestionar'
  | 'ingestas.ver'
  | 'ingestas.gestionar'
  | 'equipo.ver'
  | 'equipo.gestionar'
  | 'configuracion.ver'
  | 'configuracion.gestionar'
  | 'auditoria.ver'

export type NivelAal = 'aal1' | 'aal2' | null

export interface UsuarioContextoEditorial {
  id: string
  correo: string
  nombre: string
}

export interface ContextoEditorial {
  usuario: UsuarioContextoEditorial
  roles: RolEditorial[]
  permisos: PermisoEditorial[]
  nivelAal: NivelAal
  siguienteNivelAal: NivelAal
  requiereMfa: boolean
}

export interface ResumenPanelEditorial {
  borradores: number
  enRevision: number
  publicados: number
  totalContenidos: number
}

export interface RegistroAuditoriaEditorial {
  id: string
  accion: string
  tipoEntidad: string
  entidadId: string | null
  actorId: string | null
  metadatos: Record<string, unknown>
  creadoEn: string
}
