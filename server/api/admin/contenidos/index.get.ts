import type { RespuestaBandejaEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarContenidosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaFiltrosBandeja } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<RespuestaBandejaEditorial> => {
  await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const filtros = validarEntradaEditorial(esquemaFiltrosBandeja, getQuery(evento))
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return listarContenidosEditoriales(clienteSupabase, filtros)
})
