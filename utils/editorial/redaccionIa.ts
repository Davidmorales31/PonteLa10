import { z } from 'zod'
import { esquemaDocumentoEditorial, tiposContenidoEditorial } from './contenido'

export const versionContratoRedaccionIa = 1 as const
export const versionInstruccionesRedaccion = 'redaccion-v1' as const

const esquemaReferenciaSegmento = z.object({
  id: z.coerce.number().int().min(0),
  inicioSegundos: z.number().min(0),
  finSegundos: z.number().min(0),
  texto: z.string().trim().min(1).max(5000)
}).strict()

export const esquemaPropuestaBorradorIa = z.object({
  versionContrato: z.literal(versionContratoRedaccionIa),
  titulo: z.string().trim().min(8).max(160),
  resumen: z.string().trim().min(1).max(320),
  tipo: z.enum(tiposContenidoEditorial as [
    (typeof tiposContenidoEditorial)[number],
    ...(typeof tiposContenidoEditorial)[number][]
  ]),
  documento: esquemaDocumentoEditorial,
  seo: z.object({
    titulo: z.string().trim().max(70),
    descripcion: z.string().trim().max(170),
    textoSocial: z.string().trim().max(280)
  }).strict(),
  categoriaId: z.string().uuid().nullable(),
  temaIds: z.array(z.string().uuid()).max(12),
  fuente: z.object({
    url: z.string().url().max(2048),
    nombre: z.string().trim().min(1).max(160),
    autor: z.string().trim().max(160),
    creditos: z.string().trim().min(1).max(500)
  }).strict(),
  segmentosFundamento: z.array(esquemaReferenciaSegmento).min(1).max(100),
  afirmacionesPorCorroborar: z.array(z.string().trim().min(1).max(500)).max(30),
  advertencias: z.array(z.string().trim().min(1).max(500)).max(30)
}).strict()

export type PropuestaBorradorIa = z.infer<typeof esquemaPropuestaBorradorIa>

export const esquemaGenerarBorradorIa = z.object({
  regenerar: z.boolean().optional().default(false)
})
