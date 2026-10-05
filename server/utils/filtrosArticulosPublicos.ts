import { z } from 'zod'
import { obtenerAliasCategoria } from '~/utils/articulosLanding'

export interface ConsultaArticulosPublicos {
  paginado: boolean
  limite: number
  desplazamiento: number
  categoria: string | null
  terminosCategoria: string[]
  tema: string | null
  buscar: string | null
}

const esquemaSlug = z.string()
  .trim()
  .max(80)
  .transform(valor => valor.toLocaleLowerCase('es-CO'))
  .refine(valor => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor))

const esquemaEntero = (minimo: number, maximo: number) => z.string()
  .regex(/^(?:0|[1-9]\d*)$/)
  .transform(Number)
  .pipe(z.number().int().min(minimo).max(maximo))

const esquemaConsulta = z.object({
  paginado: z.enum(['true', 'false', '1', '0']).optional(),
  categoria: esquemaSlug.optional(),
  tema: esquemaSlug.optional(),
  buscar: z.string().trim().max(120).transform(valor => valor || undefined).optional(),
  limite: esquemaEntero(1, 50).optional(),
  desplazamiento: esquemaEntero(0, 100_000).optional()
})

export function analizarConsultaArticulosPublicos(
  parametros: Record<string, unknown>
): ConsultaArticulosPublicos | null {
  const resultado = esquemaConsulta.safeParse(parametros)
  if (!resultado.success) return null

  const datos = resultado.data
  const paginado = datos.paginado === 'true' || datos.paginado === '1'
    || datos.desplazamiento !== undefined
  const limite = Math.min(datos.limite ?? 20, paginado ? 49 : 50)

  return {
    paginado,
    limite,
    desplazamiento: datos.desplazamiento ?? 0,
    categoria: datos.categoria ?? null,
    terminosCategoria: datos.categoria ? obtenerAliasCategoria(datos.categoria) : [],
    tema: datos.tema ?? null,
    buscar: datos.buscar ?? null
  }
}
