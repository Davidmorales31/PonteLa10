import { z } from 'zod'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarPartidosSeoPublicos } from '~/server/utils/partidosSeoPublicos'
import { buscarCorrespondenciaPartidoSeo } from '~/server/utils/partidoSeoCorrespondencia'

const esquemaConsultaCorrespondencia = z.object({
  competencia: z.string().trim().min(2).max(100),
  fechaIso: z.string().datetime({ offset: true }),
  local: z.string().trim().min(2).max(100),
  visitante: z.string().trim().min(2).max(100)
})

export default defineEventHandler(async (evento) => {
  const parametros = esquemaConsultaCorrespondencia.safeParse(getQuery(evento))
  if (!parametros.success) {
    throw createError({ statusCode: 400, statusMessage: 'La identidad del partido no es válida.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  const partidos = await listarPartidosSeoPublicos(obtenerClienteSupabaseAnonimo(evento))
  const partido = buscarCorrespondenciaPartidoSeo(partidos, parametros.data)
  return { slug: partido?.slug || null }
})
