import { z } from 'zod'
import { obtenerAliasCategoria } from '~/utils/articulosLanding'

export interface FiltrosContenidoPublico {
  categoria: string | null
  terminosCategoria: string[]
  tema: string | null
  buscar: string | null
}

export interface ConsultaArticulosPublicos extends FiltrosContenidoPublico {
  paginado: boolean
  limite: number
  desplazamiento: number
}

const esquemaSlugPublico = z.string()
  .trim()
  .max(80)
  .transform(valor => valor.toLocaleLowerCase('es-CO'))
  .refine(valor => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor))

const esquemaEnteroQuery = (minimo: number, maximo: number) => z.string()
  .regex(/^(?:0|[1-9]\d*)$/)
  .transform(Number)
  .pipe(z.number().int().min(minimo).max(maximo))

const esquemaConsulta = z.object({
  paginado: z.enum(['true', 'false', '1', '0']).optional(),
  categoria: esquemaSlugPublico.optional(),
  tema: esquemaSlugPublico.optional(),
  buscar: z.string().trim().max(120).transform(valor => valor || undefined).optional(),
  limite: esquemaEnteroQuery(1, 50).optional(),
  desplazamiento: esquemaEnteroQuery(0, 100_000).optional(),
  pagina: esquemaEnteroQuery(1, 100_001).optional()
})

export function analizarConsultaArticulosPublicos(
  parametros: Record<string, unknown>
): ConsultaArticulosPublicos | null {
  const resultado = esquemaConsulta.safeParse(parametros)
  if (!resultado.success) return null

  const datos = resultado.data
  const paginadoSolicitado = datos.paginado === 'true' || datos.paginado === '1'
  const tieneDesplazamiento = datos.desplazamiento !== undefined
  const tienePagina = datos.pagina !== undefined

  if (tieneDesplazamiento && tienePagina) return null
  if (datos.paginado === 'false' || datos.paginado === '0') {
    if (tieneDesplazamiento || tienePagina) return null
  }

  const limite = datos.limite ?? 20
  const paginado = paginadoSolicitado || tieneDesplazamiento || tienePagina
  if (paginado && limite > 49) return null

  const desplazamiento = tienePagina
    ? (datos.pagina! - 1) * limite
    : datos.desplazamiento ?? 0

  if (!Number.isSafeInteger(desplazamiento) || desplazamiento > 100_000) return null

  const categoria = datos.categoria || null

  return {
    paginado,
    limite,
    desplazamiento,
    categoria,
    terminosCategoria: categoria ? obtenerAliasCategoria(categoria) : [],
    tema: datos.tema || null,
    buscar: datos.buscar || null
  }
}
