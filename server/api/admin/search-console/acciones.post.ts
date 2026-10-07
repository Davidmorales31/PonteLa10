import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaAccionSearchConsole } from '~/utils/editorial/searchConsole'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'contenido.editarTodos', { exigirMfa: true })
  const entrada = validarEntradaEditorial(esquemaAccionSearchConsole, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const { data, error } = await cliente.rpc('save_editorial_search_console_triage', {
    p_query: entrada.consulta,
    p_page_url: entrada.paginaUrl,
    p_action: entrada.accion,
    p_note: entrada.nota || null
  })

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, statusMessage: 'Guardar una acción requiere permiso editorial y MFA.' })
    }
    if (['22023', '22P02', '23514'].includes(error.code || '')) {
      throw createError({ statusCode: 422, statusMessage: 'La acción debe referirse a una fila importada y válida.' })
    }
    throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar la acción editorial.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return data
})
