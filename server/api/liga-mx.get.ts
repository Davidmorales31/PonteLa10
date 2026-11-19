import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import {
  columnasPartidosLigaMx,
  columnasPosicionesLigaMx,
  darFormaRespuestaLigaMx,
  type FilaPartidoPublicoLigaMx,
  type FilaPosicionPublicaLigaMx
} from '~/server/utils/ligaMxPublica'
import { slugsLigasMexico } from '~/data/ligaMx'

/** Calendario y tabla de la Liga MX (y Femenil). Solo filas públicas con derechos confirmados (RLS). */
export default defineEventHandler(async (evento) => {
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const ahora = new Date()
  const desde = new Date(ahora.getTime() - 46 * 24 * 60 * 60 * 1000).toISOString()
  const hasta = new Date(ahora.getTime() + 91 * 24 * 60 * 60 * 1000).toISOString()

  const [partidos, posiciones] = await Promise.all([
    cliente.from('league_fixtures').select(columnasPartidosLigaMx)
      .eq('site', 'mx').in('competition_slug', [...slugsLigasMexico])
      .eq('is_public', true).eq('publication_rights_confirmed', true)
      .gte('scheduled_at', desde).lte('scheduled_at', hasta)
      .order('scheduled_at', { ascending: true }).limit(600),
    cliente.from('league_standings').select(columnasPosicionesLigaMx)
      .eq('site', 'mx').in('competition_slug', [...slugsLigasMexico])
      .eq('is_public', true).eq('publication_rights_confirmed', true)
      .order('season', { ascending: false }).order('position', { ascending: true }).limit(200)
  ])

  const respuesta = darFormaRespuestaLigaMx(
    partidos.error ? [] : (partidos.data || []) as unknown as FilaPartidoPublicoLigaMx[],
    posiciones.error ? [] : (posiciones.data || []) as unknown as FilaPosicionPublicaLigaMx[],
    ahora
  )
  aplicarCachePublica(evento, 'tabla')
  return respuesta
})
