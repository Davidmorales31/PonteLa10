import { z } from 'zod'

export const esquemaEstadoArticulo = z.enum(['draft', 'review', 'scheduled', 'published', 'archived'])

export const esquemaEntradaArticulo = z.object({
  titulo: z.string().trim().min(8).max(140),
  slug: z
    .string()
    .trim()
    .min(4)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  bajada: z.string().trim().min(24).max(280),
  cuerpo: z.string().trim().min(80),
  categoriaId: z.string().uuid(),
  imagenPrincipalId: z.string().uuid().optional(),
  estado: esquemaEstadoArticulo.default('draft'),
  tituloSeo: z.string().trim().max(70).optional(),
  descripcionSeo: z.string().trim().max(160).optional(),
  resumenSocial: z.string().trim().max(280).optional()
})

export const esquemaPublicacionSocial = z.object({
  articuloId: z.string().uuid(),
  red: z.enum(['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'threads', 'whatsapp']),
  formato: z.enum(['feed', 'story', 'reel', 'preview', 'thumbnail']),
  copy: z.string().trim().min(8).max(2200),
  rutaAsset: z.string().trim().max(512).optional()
})

export type EntradaArticulo = z.infer<typeof esquemaEntradaArticulo>
export type EntradaPublicacionSocial = z.infer<typeof esquemaPublicacionSocial>
