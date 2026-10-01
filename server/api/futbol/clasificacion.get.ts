import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { proyectarStandingsFutbolPublicos } from '~/utils/proyeccionFutbolPublico'
import { z } from 'zod'

type Fila = Record<string, unknown>

export default defineCachedEventHandler(async (evento) => {
  const configuracion = useRuntimeConfig(evento)
  const competencia = z.string().uuid().safeParse(String(configuracion.futbolLigaBetplayCompetitionId || '').trim())
  if (!competencia.success) return respuestaVacia()
  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) return respuestaVacia()

  const { data, error } = await cliente
    .from('football_standings_today')
    .select('business_date,provider,competition_id,league_id,league_name,season,standings,provider_fetched_at,is_public,publication_rights_confirmed')
    .eq('is_public', true)
    .eq('publication_rights_confirmed', true)
    .eq('competition_id', competencia.data)
    .order('business_date', { ascending: false })
    .order('provider_fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data || !(await validarClasificacionPublicable(cliente, data as unknown as Fila))) {
    return respuestaVacia()
  }

  try {
    return { estado: 'disponible' as const, clasificacion: proyectarStandingsFutbolPublicos(data) }
  } catch {
    return respuestaVacia()
  }
}, {
  maxAge: 300,
  swr: true,
  getKey: () => 'futbol-clasificacion-publica'
})

async function validarClasificacionPublicable(cliente: ReturnType<typeof obtenerClienteSupabasePrivado> & {}, fila: Fila): Promise<boolean> {
  const competenciaId = texto(fila.competition_id)
  const provider = fila.provider === 'goal-api' || fila.provider === 'api-football' ? fila.provider : null
  const ligaExterna = texto(fila.league_id)
  if (!competenciaId || !provider || !ligaExterna
    || fila.is_public !== true || fila.publication_rights_confirmed !== true) return false

  const equipos = extraerEquipos(fila.standings)
  if (!equipos.length) return false
  const idsEquipo = [...new Set(equipos.map(equipo => equipo.id))]
  const idsExternos = [...new Set([ligaExterna, ...equipos.map(equipo => equipo.providerId)])]
  const [competencia, equiposPublicos, mappings] = await Promise.all([
    cliente.from('sports_competitions').select('id').eq('id', competenciaId).eq('is_public', true).maybeSingle(),
    cliente.from('sports_teams').select('id').in('id', idsEquipo).eq('is_public', true),
    cliente.from('sports_provider_mappings')
      .select('entity_type,external_id,competition_id,team_id,provider')
      .eq('provider', provider)
      .in('entity_type', ['competition', 'team'])
      .in('external_id', idsExternos)
      .limit(1000)
  ])
  if (competencia.error || !competencia.data || equiposPublicos.error || mappings.error
    || !equiposPublicos.data || !mappings.data) return false

  const idsPublicos = new Set((equiposPublicos.data as Fila[]).map(equipo => equipo.id))
  const clavesMappings = new Set<string>()
  for (const mapping of mappings.data as Fila[]) {
    const destino = mapping.entity_type === 'competition' ? mapping.competition_id
      : mapping.entity_type === 'team' ? mapping.team_id : null
    if (destino) clavesMappings.add(`${mapping.entity_type}\u0000${mapping.external_id}\u0000${destino}`)
  }

  return equipos.every(equipo => idsPublicos.has(equipo.id)
    && clavesMappings.has(`team\u0000${equipo.providerId}\u0000${equipo.id}`))
    && clavesMappings.has(`competition\u0000${ligaExterna}\u0000${competenciaId}`)
}

function extraerEquipos(valor: unknown): Array<{ id: string; providerId: string }> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return []
  const grupos = (valor as Fila).grupos
  if (!Array.isArray(grupos)) return []
  return grupos.flatMap((grupo) => {
    if (!grupo || typeof grupo !== 'object' || Array.isArray(grupo)) return []
    const filas = (grupo as Fila).filas
    if (!Array.isArray(filas)) return []
    return filas.flatMap((fila) => {
      if (!fila || typeof fila !== 'object' || Array.isArray(fila)) return []
      const equipo = (fila as Fila).equipo
      if (!equipo || typeof equipo !== 'object' || Array.isArray(equipo)) return []
      const id = texto((equipo as Fila).id)
      const providerId = texto((equipo as Fila).providerId)
      return id && providerId ? [{ id, providerId }] : []
    })
  })
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

function respuestaVacia() {
  return {
    estado: 'sin_datos' as const,
    clasificacion: null,
    aviso: 'La clasificación verificada aún no está disponible.'
  }
}
