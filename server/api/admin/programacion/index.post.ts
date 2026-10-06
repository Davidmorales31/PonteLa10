import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarPartidosSeoAdministrables } from '~/server/utils/partidosSeoPublicos'
import { esquemaProgramacionTransmision } from '~/utils/partidos/programacion'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'partidos.programacion.gestionar', { exigirMfa: true })
  const entrada = validarEntradaEditorial(esquemaProgramacionTransmision, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const partidos = await listarPartidosSeoAdministrables(cliente)
  const partido = partidos.find(actual => actual.slug === entrada.matchSlug)
  if (!partido) {
    throw createError({ statusCode: 404, statusMessage: 'El partido no existe en el calendario público.' })
  }

  const { data, error } = await cliente
    .from('colombian_match_broadcast_options')
    .upsert({
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
    }, { onConflict: 'match_slug,country_code,channel,platform' })
    .select('id,match_slug,country_code,channel,platform,distribution_type,source_url,status,verified_at,notes,updated_at')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar la programación.' })
  }
  setResponseStatus(evento, 201)
  return { programacion: data }
})
