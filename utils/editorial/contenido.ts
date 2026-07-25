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
