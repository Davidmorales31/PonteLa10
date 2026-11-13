import { z } from 'zod'
import { exigirPermisoEditorial, exigirMfaSegunPoliticaEditorial } from '~/server/utils/autorizacionEditorial'
import { validarOrigenOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
export default defineEventHandler(async evento => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.editarTodos')
  exigirMfaSegunPoliticaEditorial(contexto)
  validarOrigenOAuthSocial(evento)
  const entrada = z.object({ loteId: z.string().uuid(), confirmar: z.literal(true) }).strict().safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'Confirma el lote que deseas cancelar.' })
  const resultado = await clienteOAuthSocial(evento).rpc('cancel_social_schedule', { p_id: entrada.data.loteId, p_actor_id: contexto.usuario.id })
  if (resultado.error) throw createError({ statusCode: 409, statusMessage: 'No se pudo cancelar este lote.' })
  return { canceladas: resultado.data }
})
