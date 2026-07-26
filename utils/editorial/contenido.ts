import { z } from 'zod'
import type {
  EstadoContenidoEditorial,
  OrigenContenidoEditorial,
  TipoContenidoEditorial,
  TipoTaxonomiaEditorial
} from '~/types/contenidoEditorial'

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
