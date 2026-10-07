import { z } from 'zod'
import type {
  IdPlantillaEditorial,
  IntencionBusquedaEditorial
} from '~/types/contenidoEditorial'
import { esIdPlantillaEditorial, obtenerPlantillaEditorial } from '~/utils/editorial/plantillas'

export const intencionesBusquedaEditoriales = [
  'actualidad',
  'resultado',
  'transmision',
  'calendario',
  'explicacion',
  'perfil',
  'analisis',
  'opinion'
] as const satisfies readonly IntencionBusquedaEditorial[]

const textoOpcional = (maximo: number) => z.preprocess(
  valor => typeof valor === 'string' ? valor.trim() || null : valor,
  z.string().max(maximo).nullable()
)

const intencionOpcional = z.preprocess(
  valor => valor === '' ? null : valor,
  z.enum(intencionesBusquedaEditoriales).nullable()
)

const plantillaOpcional = z.custom<IdPlantillaEditorial | null>(
  valor => valor === null || esIdPlantillaEditorial(valor)
)

const ventanaOpcional = z.preprocess(
  valor => valor === '' || valor === undefined ? null : valor,
  z.number().int().min(0).max(3650).nullable()
)

export const esquemaBriefSeoArticulo = z.object({
  consultaObjetivo: textoOpcional(160).refine(
    valor => valor === null || valor.length >= 2,
    'La consulta debe tener al menos dos caracteres.'
  ),
  intencionBusqueda: intencionOpcional,
  plantillaId: plantillaOpcional,
  camposCompletos: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
  clusterPrincipal: textoOpcional(120),
  ventanaFrescuraDias: ventanaOpcional,
  origenOportunidad: textoOpcional(2048),
  diferenciadorEditorial: textoOpcional(500),
  estadoBrief: z.enum(['propuesto', 'confirmado'])
}).strict().superRefine((brief, contexto) => {
  const plantilla = obtenerPlantillaEditorial(brief.plantillaId)
  if (new Set(brief.camposCompletos).size !== brief.camposCompletos.length) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['camposCompletos'],
      message: 'No repitas campos en la lista de verificación.'
    })
  }
  if (brief.camposCompletos.some(campo => !plantilla?.camposMinimos.includes(campo))) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['camposCompletos'],
      message: 'La lista solo puede incluir campos mínimos de la plantilla seleccionada.'
    })
  }
  if (plantilla && brief.intencionBusqueda !== plantilla.intencion) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['intencionBusqueda'],
      message: 'La intención de búsqueda debe coincidir con la plantilla editorial.'
    })
  }
})

export type EntradaBriefSeoArticulo = z.infer<typeof esquemaBriefSeoArticulo>

export function esIntencionBusquedaEditorial(valor: unknown): valor is IntencionBusquedaEditorial {
  return typeof valor === 'string'
    && intencionesBusquedaEditoriales.includes(valor as IntencionBusquedaEditorial)
}
