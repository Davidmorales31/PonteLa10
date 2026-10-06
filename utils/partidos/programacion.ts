import { z } from 'zod'

export const tiposDistribucionProgramacion = [
  'free_tv',
  'paid_tv',
  'free_streaming',
  'subscription_streaming',
  'radio'
] as const

export const estadosProgramacion = ['confirmed', 'unconfirmed', 'cancelled'] as const

const esquemaUrlFuente = z.string().trim().url().max(2048).refine((valor) => {
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}, 'La fuente debe ser una dirección HTTPS válida.')

export const esquemaProgramacionTransmision = z.object({
  matchSlug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  countryCode: z.string().trim().regex(/^[A-Z]{2}$/),
  channel: z.string().trim().min(2).max(120),
  platform: z.string().trim().min(2).max(120),
  distributionType: z.enum(tiposDistribucionProgramacion),
  sourceUrl: esquemaUrlFuente,
  status: z.enum(estadosProgramacion),
  notes: z.string().trim().max(1500).nullable().optional()
})

export type EntradaProgramacionTransmision = z.infer<typeof esquemaProgramacionTransmision>

export interface ProgramacionTransmisionPublica {
  id: string
  matchSlug: string
  countryCode: string
  channel: string
  platform: string
  distributionType: typeof tiposDistribucionProgramacion[number]
  sourceUrl: string
  status: typeof estadosProgramacion[number]
  verifiedAt: string | null
  notes: string | null
}

export const etiquetasDistribucionProgramacion: Record<typeof tiposDistribucionProgramacion[number], string> = {
  free_tv: 'Televisión abierta',
  paid_tv: 'Televisión por suscripción',
  free_streaming: 'Streaming gratuito',
  subscription_streaming: 'Streaming por suscripción',
  radio: 'Radio'
}

export const etiquetasEstadoProgramacion: Record<typeof estadosProgramacion[number], string> = {
  confirmed: 'Confirmada',
  unconfirmed: 'Pendiente de confirmar',
  cancelled: 'Cancelada'
}
