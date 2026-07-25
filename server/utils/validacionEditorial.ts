import type { z } from 'zod'

export function validarEntradaEditorial<Esquema extends z.ZodTypeAny>(
  esquema: Esquema,
  entrada: unknown
): z.infer<Esquema> {
  const resultado = esquema.safeParse(entrada)

  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Los datos enviados no son validos.',
      data: {
        codigo: 'DATOS_EDITORIALES_INVALIDOS',
        campos: resultado.error.flatten().fieldErrors
      }
    })
  }

  return resultado.data
}
