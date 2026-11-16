import { z } from 'zod'
import { contextoPublicacionPropia } from '~/server/utils/contextoPublicacionPropia'
import { leerPublicacionPropia, programarPublicacionPropia, validarMediosPropios } from '~/server/utils/repositorioPublicacionesPropias'
import { renderizarImagenesPropias } from '~/server/utils/renderizadorPublicacionPropia'
import { estadoProgramadorSocial } from '~/server/utils/configuracionSocialProduccion'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { avisosPublicacionPropia, esquemaProgramarPublicacionPropia } from '~/utils/editorial/publicacionesPropias'

export default defineEventHandler(async (evento) => {
  const { contexto, cliente, privado } = await contextoPublicacionPropia(evento, true)
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  const entrada = esquemaProgramarPublicacionPropia.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'Elige una fecha y confirma la programación.' })
  const inicio = Date.parse(entrada.data.fecha)
  if (inicio < Date.now() + 60_000 || inicio > Date.now() + 90 * 86400_000) throw createError({ statusCode: 422, statusMessage: 'Elige una hora entre un minuto y 90 días en el futuro.' })
  const latido = await privado.from('social_scheduler_state').select('last_seen_at').eq('id', true).maybeSingle()
  if (latido.error || !estadoProgramadorSocial(latido.data?.last_seen_at)) throw createError({ statusCode: 503, statusMessage: 'El programador no está activo. No se programó la publicación.' })
  const publicacion = await leerPublicacionPropia(privado, id)
  const avisos = avisosPublicacionPropia(publicacion.documento, publicacion.destinos)
  if (avisos.length) throw createError({ statusCode: 422, statusMessage: avisos[0] })
  await validarMediosPropios(cliente, publicacion.documento)
  await renderizarImagenesPropias(cliente, publicacion.documento) // falla ahora, no en la hora programada
  return programarPublicacionPropia(privado, id, contexto.usuario.id, new Date(inicio).toISOString(), entrada.data.revision)
})
