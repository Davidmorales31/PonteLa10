import type { PerfilJugadorEuropa } from '~/data/jugadoresColombianosEuropa'
import { partidoCorrespondeAClubJugador } from '~/data/jugadoresColombianosEuropa'
import type { PartidoResultado } from '~/types/resultados'
import type { PartidoLiga } from '~/types/partidosLiga'

export interface PartidoClubEuropa {
  id: string
  ruta: string
  estado: 'EN VIVO' | 'FINALIZADO' | 'PROGRAMADO'
  partido: PartidoLiga
}

/** Adapta los snapshots públicos a las tarjetas compartidas, sin estimar marcadores. */
export function prepararPartidosClubesEuropa(
  partidos: readonly PartidoResultado[],
  perfiles: readonly PerfilJugadorEuropa[],
  actualizadoEn: string
): PartidoClubEuropa[] {
  const identificadores = new Set<string>()
  return partidos
    .filter(partido => {
      if (partido.deporte !== 'futbol' || !partido.id || !Number.isFinite(Date.parse(partido.fechaIso))) return false
      if (identificadores.has(partido.id) || !perfiles.some(perfil => partidoCorrespondeAClubJugador(partido, perfil))) return false
      identificadores.add(partido.id)
      return true
    })
    .sort((primero, segundo) => Date.parse(primero.fechaIso) - Date.parse(segundo.fechaIso))
    .map(partido => ({
      id: partido.id,
      ruta: `/resultados/${encodeURIComponent(partido.id)}`,
      estado: partido.estado === 'en-vivo' ? 'EN VIVO' : partido.estado === 'finalizado' ? 'FINALIZADO' : 'PROGRAMADO',
      partido: {
        slug: partido.id,
        competencia: partido.competencia,
        temporada: String(partido.temporada || ''),
        jornada: partido.jornada || null,
        fechaIso: partido.fechaIso,
        local: partido.equipoLocal.nombre,
        visitante: partido.equipoVisitante.nombre,
        estado: partido.estado,
        golesLocal: Number.isFinite(partido.marcadorLocal) ? partido.marcadorLocal! : null,
        golesVisitante: Number.isFinite(partido.marcadorVisitante) ? partido.marcadorVisitante! : null,
        estadio: partido.estadio || null,
        ciudad: partido.ciudad || null,
        fuenteOficialUrl: null,
        escudoLocal: partido.equipoLocal.logo || null,
        escudoVisitante: partido.equipoVisitante.logo || null,
        verificadoEn: actualizadoEn
      }
    }))
}
