import { getRouterParam } from 'h3'
import { z } from 'zod'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarPartidosSeoAdministrables } from '~/server/utils/partidosSeoPublicos'
import { esquemaProgramacionTransmision } from '~/utils/partidos/programacion'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'partidos.programacion.gestionar', { exigirMfa: true })
  const id = z.string().uuid().safeParse(getRouterParam(evento, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: 'El identificador no es válido.' })
  const entrada = validarEntradaEditorial(esquemaProgramacionTransmision, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const partido = (await listarPartidosSeoAdministrables(cliente)).find(actual => actual.slug === entrada.matchSlug)
  if (!partido) throw createError({ statusCode: 404, statusMessage: 'El partido no existe en el calendario público.' })

  const { data, error } = await cliente
    .from('colombian_match_broadcast_options')
    .update({
      match_slug: partido.slug,
      fixture_competition_slug: partido.identidadFuente.competenciaSlug,
      fixture_season: partido.identidadFuente.temporada,
      fixture_provider: partido.identidadFuente.proveedor,
      provider_fixture_id: partido.identidadFuente.idProveedor,
      country_code: entrada.countryCode,
      channel: entrada.channel,
      platform: entrada.platform,
      distribution_type: entrada.distributionType,
      source_url: entrada.sourceUrl,
      status: entrada.status,
      notes: entrada.notes ?? null
    })
    .eq('id', id.data)
    .select('id,match_slug,country_code,channel,platform,distribution_type,source_url,status,verified_at,notes,updated_at')
    .maybeSingle()

  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudo actualizar la programación.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'No encontramos esa programación.' })
  return { programacion: data }
})
