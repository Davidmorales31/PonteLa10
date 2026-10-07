import { z } from 'zod'
import type { IntencionBusquedaEditorial } from '~/types/contenidoEditorial'

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
  clusterPrincipal: textoOpcional(120),
  ventanaFrescuraDias: ventanaOpcional,
  origenOportunidad: textoOpcional(2048),
  diferenciadorEditorial: textoOpcional(500),
  estadoBrief: z.enum(['propuesto', 'confirmado'])
}).strict()

export type EntradaBriefSeoArticulo = z.infer<typeof esquemaBriefSeoArticulo>

export function esIntencionBusquedaEditorial(valor: unknown): valor is IntencionBusquedaEditorial {
  return typeof valor === 'string'
    && intencionesBusquedaEditoriales.includes(valor as IntencionBusquedaEditorial)
}
