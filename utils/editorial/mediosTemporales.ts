import { z } from 'zod'

/** Tipos aceptados desde el dispositivo. Safari convierte HEIC a JPEG cuando el selector pide estos tipos. */
export const tiposTemporalesSociales = {
  'image/jpeg': { tipo: 'imagen', extension: 'jpg' },
  'image/png': { tipo: 'imagen', extension: 'png' },
  'image/webp': { tipo: 'imagen', extension: 'webp' },
  'video/mp4': { tipo: 'video', extension: 'mp4' },
  'video/quicktime': { tipo: 'video', extension: 'mov' }
} as const
export type MimeTemporalSocial = keyof typeof tiposTemporalesSociales
export type TipoTemporalSocial = 'imagen' | 'video'

export const aceptarImagenesTemporales = 'image/jpeg,image/png,image/webp'
export const aceptarVideosTemporales = 'video/mp4,video/quicktime'

export const esquemaIniciarTemporalSocial = z.object({
  nombre: z.string().trim().min(1).max(200),
  tipoMime: z.enum(Object.keys(tiposTemporalesSociales) as [MimeTemporalSocial, ...MimeTemporalSocial[]]),
  tamano: z.number().int().positive(),
  publicacionId: z.string().uuid().optional()
}).strict()

export interface TemporalSocialVista {
  id: string, tipo: TipoTemporalSocial, ancho: number | null, alto: number | null, url: string, nombre: string
}
