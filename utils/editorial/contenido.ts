import { z } from 'zod'
import type {
  AccionFlujoEditorial,
  EstadoContenidoEditorial,
  OrigenContenidoEditorial,
  TipoContenidoEditorial,
  TipoTaxonomiaEditorial
} from '~/types/contenidoEditorial'
import type { PermisoEditorial } from '~/types/editorial'

export const estadosContenidoEditorial: EstadoContenidoEditorial[] = [
  'draft',
  'review',
  'changes_requested',
  'approved',
  'scheduled',
  'published',
  'archived'
]

export const tiposContenidoEditorial: TipoContenidoEditorial[] = [
  'breve',
  'noticia',
  'analisis',
  'blog',
  'informe',
  'opinion',
  'especial'
]

export const origenesContenidoEditorial: OrigenContenidoEditorial[] = [
  'manual',
  'ingesta',
  'importacion',
  'asistenteIa'
]

export const tiposTaxonomiaEditorial: TipoTaxonomiaEditorial[] = [
  'categoria',
  'tema',
  'etiqueta'
]

export const etiquetasEstadoContenido: Record<EstadoContenidoEditorial, string> = {
  draft: 'Borrador',
  review: 'En revisión',
  changes_requested: 'Cambios solicitados',
  approved: 'Aprobado',
  scheduled: 'Programado',
  published: 'Publicado',
  archived: 'Archivado'
}

export const etiquetasTipoContenido: Record<TipoContenidoEditorial, string> = {
  breve: 'Breve',
  noticia: 'Noticia',
  analisis: 'Análisis',
  blog: 'Blog',
  informe: 'Informe',
  opinion: 'Opinión',
  especial: 'Especial'
}

export const etiquetasOrigenContenido: Record<OrigenContenidoEditorial, string> = {
  manual: 'Manual',
  ingesta: 'Ingesta',
  importacion: 'Importación',
  asistenteIa: 'Asistente IA'
}

export const documentoEditorialVacio = {
  type: 'doc',
  content: []
} as const

export const esquemaFiltrosBandeja = z.object({
  buscar: z.string().trim().max(100).optional().default(''),
  estado: z.enum(estadosContenidoEditorial as [EstadoContenidoEditorial, ...EstadoContenidoEditorial[]])
    .optional(),
  tipo: z.enum(tiposContenidoEditorial as [TipoContenidoEditorial, ...TipoContenidoEditorial[]])
    .optional(),
  origen: z.enum(origenesContenidoEditorial as [OrigenContenidoEditorial, ...OrigenContenidoEditorial[]])
    .optional(),
  categoriaId: z.string().uuid().optional(),
  pagina: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limite: z.coerce.number().int().min(10).max(50).optional().default(20),
  orden: z.enum(['actualizadoDesc', 'actualizadoAsc', 'tituloAsc'])
    .optional()
    .default('actualizadoDesc')
})

export const esquemaCrearBorrador = z.object({
  titulo: z.string().trim().min(8).max(160),
  resumen: z.string().trim().max(320).optional().default(''),
  tipo: z.enum(tiposContenidoEditorial as [TipoContenidoEditorial, ...TipoContenidoEditorial[]])
    .default('noticia'),
  categoriaId: z.string().uuid().nullable().optional().default(null)
})

export const esquemaCrearTaxonomia = z.object({
  tipo: z.enum(tiposTaxonomiaEditorial as [
    TipoTaxonomiaEditorial,
    ...TipoTaxonomiaEditorial[]
  ]),
  nombre: z.string().trim().min(2).max(80),
  descripcion: z.string().trim().max(240).optional().default(''),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#174EA6')
})

const esquemaTextoNodo = z.object({
  type: z.literal('text'),
  text: z.string().max(5000)
})

const esquemaParrafo = z.object({
  type: z.literal('paragraph'),
  content: z.array(esquemaTextoNodo).max(1)
})

const esquemaEncabezado = z.object({
  type: z.literal('heading'),
  attrs: z.object({
    level: z.union([z.literal(2), z.literal(3)])
  }),
  content: z.array(esquemaTextoNodo).max(1)
})

const esquemaCita = z.object({
  type: z.literal('blockquote'),
  content: z.array(esquemaParrafo).min(1).max(1)
})

const esquemaElementoLista = z.object({
  type: z.literal('listItem'),
  content: z.array(esquemaParrafo).min(1).max(1)
})

const esquemaLista = z.object({
  type: z.union([z.literal('bulletList'), z.literal('orderedList')]),
  content: z.array(esquemaElementoLista).max(50)
})

export const esquemaDocumentoEditorial = z.object({
  type: z.literal('doc'),
  content: z.array(z.union([
    esquemaParrafo,
    esquemaEncabezado,
    esquemaCita,
    esquemaLista
  ])).max(80)
}).refine(
  documento => JSON.stringify(documento).length <= 140000,
  'El cuerpo supera el tamaño permitido.'
)

const esquemaIdsTaxonomia = z.array(z.string().uuid())
  .max(12)
  .refine(ids => new Set(ids).size === ids.length, 'No repitas taxonomías.')

const esquemaUrlOpcional = z.union([
  z.literal(''),
  z.string().url().max(2048)
])

export const esquemaDatosEditorArticulo = z.object({
  titulo: z.string().trim().min(8).max(160),
  slug: z.string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  resumen: z.string().trim().max(320),
  tipo: z.enum(tiposContenidoEditorial as [
    TipoContenidoEditorial,
    ...TipoContenidoEditorial[]
  ]),
  categoriaId: z.string().uuid().nullable(),
  portadaId: z.string().uuid().nullable().default(null),
  temaIds: esquemaIdsTaxonomia,
  etiquetaIds: esquemaIdsTaxonomia,
  documento: esquemaDocumentoEditorial,
  fuente: z.object({
    url: esquemaUrlOpcional,
    nombre: z.string().trim().max(160),
    autor: z.string().trim().max(160),
    creditos: z.string().trim().max(500)
  }),
  seo: z.object({
    titulo: z.string().trim().max(70),
    descripcion: z.string().trim().max(170),
    textoSocial: z.string().trim().max(300)
  })
})

export const esquemaGuardarArticulo = esquemaDatosEditorArticulo.extend({
  versionBloqueo: z.number().int().positive(),
  notaCambio: z.string().trim().max(160).optional().default('')
})

const esquemaDatosAutoguardadoArticulo = esquemaDatosEditorArticulo.extend({
  titulo: z.string().max(160),
  slug: z.string().max(120),
  fuente: esquemaDatosEditorArticulo.shape.fuente.extend({
    url: z.string().max(2048)
  })
})

export const esquemaAutoguardadoArticulo = z.object({
  versionBase: z.number().int().positive(),
  datos: esquemaDatosAutoguardadoArticulo
})

export const esquemaIdEditorial = z.string().uuid()

export const esquemaTransicionEditorial = z.object({
  estadoObjetivo: z.enum(estadosContenidoEditorial as [
    EstadoContenidoEditorial,
    ...EstadoContenidoEditorial[]
  ]),
  versionBloqueo: z.number().int().positive(),
  nota: z.string().trim().max(1000).optional().default(''),
  programadoPara: z.string().datetime({ offset: true }).nullable().optional().default(null)
}).superRefine((entrada, contexto) => {
  if (entrada.estadoObjetivo === 'changes_requested' && entrada.nota.length < 10) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nota'],
      message: 'Explica los cambios solicitados con al menos 10 caracteres.'
    })
  }

  if (entrada.estadoObjetivo === 'scheduled' && !entrada.programadoPara) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['programadoPara'],
      message: 'Selecciona la fecha y hora de publicación.'
    })
  }
})

export const esquemaComentarioRevision = z.object({
  mensaje: z.string().trim().min(3).max(1000)
})

const definicionesAccionesFlujo: Record<
  string,
  AccionFlujoEditorial & { permiso: PermisoEditorial }
> = {
  enviarRevision: {
    id: 'enviarRevision',
    estadoObjetivo: 'review',
    etiqueta: 'Enviar a revisión',
    descripcion: 'Bloquea la edición mientras el equipo revisa el contenido.',
    requiereNota: false,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.enviarRevision'
  },
  solicitarCambios: {
    id: 'solicitarCambios',
    estadoObjetivo: 'changes_requested',
    etiqueta: 'Solicitar cambios',
    descripcion: 'Devuelve el contenido al autor con observaciones obligatorias.',
    requiereNota: true,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.revisar'
  },
  aprobar: {
    id: 'aprobar',
    estadoObjetivo: 'approved',
    etiqueta: 'Aprobar',
    descripcion: 'Confirma que el contenido está listo para programarse o publicarse.',
    requiereNota: false,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.aprobar'
  },
  programar: {
    id: 'programar',
    estadoObjetivo: 'scheduled',
    etiqueta: 'Programar',
    descripcion: 'Define una fecha futura de publicación.',
    requiereNota: false,
    requiereProgramacion: true,
    requiereMfa: true,
    permiso: 'contenido.programar'
  },
  publicar: {
    id: 'publicar',
    estadoObjetivo: 'published',
    etiqueta: 'Publicar ahora',
    descripcion: 'Hace visible la versión aprobada en el sitio público.',
    requiereNota: false,
    requiereProgramacion: false,
    requiereMfa: true,
    permiso: 'contenido.publicar'
  },
  cancelarProgramacion: {
    id: 'cancelarProgramacion',
    estadoObjetivo: 'approved',
    etiqueta: 'Cancelar programación',
    descripcion: 'Regresa el contenido al estado aprobado.',
    requiereNota: false,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.aprobar'
  },
  crearRevision: {
    id: 'crearRevision',
    estadoObjetivo: 'draft',
    etiqueta: 'Crear nueva revisión',
    descripcion: 'Abre una copia editable sin retirar la versión pública.',
    requiereNota: false,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.editarTodos'
  },
  archivar: {
    id: 'archivar',
    estadoObjetivo: 'archived',
    etiqueta: 'Archivar',
    descripcion: 'Retira el contenido del flujo y de la vista pública.',
    requiereNota: true,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.archivar'
  },
  reabrir: {
    id: 'reabrir',
    estadoObjetivo: 'draft',
    etiqueta: 'Reabrir borrador',
    descripcion: 'Devuelve el contenido archivado a edición.',
    requiereNota: false,
    requiereProgramacion: false,
    requiereMfa: false,
    permiso: 'contenido.editarTodos'
  }
}

const accionesPorEstado: Record<EstadoContenidoEditorial, string[]> = {
  draft: ['enviarRevision', 'archivar'],
  review: ['solicitarCambios', 'aprobar', 'archivar'],
  changes_requested: ['enviarRevision', 'archivar'],
  approved: ['solicitarCambios', 'programar', 'publicar', 'archivar'],
  scheduled: ['solicitarCambios', 'cancelarProgramacion', 'publicar', 'archivar'],
  published: ['crearRevision', 'archivar'],
  archived: ['reabrir']
}

export function obtenerAccionesFlujoEditorial(
  estado: EstadoContenidoEditorial,
  permisos: readonly PermisoEditorial[]
): AccionFlujoEditorial[] {
  return accionesPorEstado[estado]
    .map(id => definicionesAccionesFlujo[id])
    .filter(definicion => permisos.includes(definicion.permiso))
    .map(({ permiso: _permiso, ...accion }) => accion)
}

export function obtenerPermisoTransicionEditorial(
  estadoObjetivo: EstadoContenidoEditorial,
  estadoActual: EstadoContenidoEditorial
): PermisoEditorial {
  if (estadoObjetivo === 'review') return 'contenido.enviarRevision'
  if (estadoObjetivo === 'changes_requested') return 'contenido.revisar'
  if (estadoObjetivo === 'approved') return 'contenido.aprobar'
  if (estadoObjetivo === 'scheduled') return 'contenido.programar'
  if (estadoObjetivo === 'published') return 'contenido.publicar'
  if (estadoObjetivo === 'archived') return 'contenido.archivar'
  if (estadoObjetivo === 'draft' && ['published', 'archived'].includes(estadoActual)) {
    return 'contenido.editarTodos'
  }
  return 'contenido.verBorradores'
}

export function crearSlugEditorial(valor: string): string {
  const slug = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120)
    .replace(/-+$/g, '')

  return slug || 'contenido'
}

export function crearSufijoSlug(): string {
  return crypto.randomUUID().slice(0, 8)
}
