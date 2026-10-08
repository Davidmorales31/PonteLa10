import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { construirSaludFrescuraFutbol, type FilaPartidoSaludFrescura, type FilaTablaSaludFrescura } from '~/server/utils/saludFrescuraFutbol'

const limiteCalendario = 1000
const limiteTablas = 500

export default defineEventHandler(async (evento) => {
  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  await exigirPermisoEditorial(evento, 'configuracion.ver')

  const cliente = obtenerClienteSupabaseEditorial(evento)
  const [respuestaCalendario, respuestaTablas] = await Promise.all([
    cliente.from('colombian_league_fixtures')
      .select('competition_slug,status,scheduled_at,checked_at', { count: 'exact' })
      .in('competition_slug', ['liga-betplay', 'torneo-betplay', 'copa-colombia'])
      .eq('is_public', true)
      .eq('publication_rights_confirmed', true)
      .order('checked_at', { ascending: true })
      .limit(limiteCalendario),
    cliente.from('colombian_league_standings')
      .select('competition_slug,checked_at', { count: 'exact' })
      .in('competition_slug', ['liga-betplay', 'torneo-betplay', 'copa-colombia'])
      .eq('is_public', true)
      .eq('publication_rights_confirmed', true)
      .order('checked_at', { ascending: true })
      .limit(limiteTablas)
  ])

  if (respuestaCalendario.error || !respuestaCalendario.data || respuestaTablas.error || !respuestaTablas.data) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo consultar la frescura de los datos públicos de fútbol.',
      data: { codigo: 'FRESCURA_FUTBOL_NO_DISPONIBLE' }
    })
  }

  return construirSaludFrescuraFutbol(
    respuestaCalendario.data as unknown as FilaPartidoSaludFrescura[],
    respuestaTablas.data as unknown as FilaTablaSaludFrescura[],
    Date.now(),
    respuestaCalendario.count ?? respuestaCalendario.data.length,
    respuestaTablas.count ?? respuestaTablas.data.length,
    limiteCalendario,
    limiteTablas
  )
})
