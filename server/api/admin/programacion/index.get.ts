import { createError } from 'h3'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarPartidosSeoAdministrables } from '~/server/utils/partidosSeoPublicos'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'partidos.programacion.gestionar', { exigirMfa: true })
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const partidos = await listarPartidosSeoAdministrables(cliente)
  const desde = Date.now() - 5 * 60 * 60_000
  const hasta = Date.now() + 120 * 24 * 60 * 60_000
  const partidosSeleccionables = partidos
    .filter(partido => Date.parse(partido.fechaIso) >= desde && Date.parse(partido.fechaIso) <= hasta)
    .slice(0, 160)
    .map(({ slug, local, visitante, fechaIso, competencia }) => ({ slug, local, visitante, fechaIso, competencia }))

  const { data, error } = await cliente
    .from('colombian_match_broadcast_options')
    .select('id,match_slug,country_code,channel,platform,distribution_type,source_url,status,verified_at,notes,updated_at')
    .order('updated_at', { ascending: false })
    .limit(300)

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo cargar la programación de transmisiones.' })
  }

  return {
    partidos: partidosSeleccionables,
    programaciones: (data || []).map(fila => ({
      id: fila.id,
      matchSlug: fila.match_slug,
      countryCode: fila.country_code,
      channel: fila.channel,
      platform: fila.platform,
      distributionType: fila.distribution_type,
      sourceUrl: fila.source_url,
      status: fila.status,
      verifiedAt: fila.verified_at,
      notes: fila.notes,
      updatedAt: fila.updated_at
    }))
  }
})
