import type {
  EstadoContenidoEditorial,
  ResultadoTransicionEditorial
} from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { transicionarArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaIdEditorial,
  esquemaTransicionEditorial,
  obtenerPermisoTransicionEditorial
} from '~/utils/editorial/contenido'

export default defineEventHandler(async (
  evento
): Promise<ResultadoTransicionEditorial> => {
  const contexto = await exigirPermisoEditorial(
    evento,
    'contenido.verBorradores'
  )
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(
    esquemaTransicionEditorial,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const { data, error } = await clienteSupabase
    .from('articles')
    .select('status')
    .eq('id', articuloId)
    .maybeSingle()

  if (error || !data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'El contenido no existe.',
      data: { codigo: 'CONTENIDO_EDITORIAL_NO_ENCONTRADO' }
    })
  }

  const estadoActual = data.status as EstadoContenidoEditorial
  const permiso = obtenerPermisoTransicionEditorial(
    entrada.estadoObjetivo,
    estadoActual
  )

  if (!contexto.permisos.includes(permiso)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No tienes permiso para realizar esta transición.',
      data: {
        codigo: 'TRANSICION_EDITORIAL_NO_AUTORIZADA',
        permiso
      }
    })
  }

  return transicionarArticuloEditorial(
    clienteSupabase,
    articuloId,
    entrada
  )
})
