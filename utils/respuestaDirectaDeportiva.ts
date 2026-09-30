import type { PartidoResultado } from '~/types/resultados'
import { normalizarZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

export interface DatosRespuestaDirectaDeportiva {
  fecha: string | null
  hora: string | null
  referenciaZonaHoraria: string | null
  competencia: string | null
  estadio: string | null
  estado: string
  resultado: string | null
  descripcionMarcador: string
}

export function crearDatosRespuestaDirectaDeportiva(
  partido: PartidoResultado,
  zonaRecibida: unknown = zonaHorariaColombia
): DatosRespuestaDirectaDeportiva {
  const zonaHoraria = normalizarZonaHoraria(zonaRecibida)
  const fechaRecibida = partido.fechaIso.trim()
  const tieneHoraConfirmada = /[Tt]\d{2}:\d{2}/.test(fechaRecibida)
  const esFechaSinHora = /^\d{4}-\d{2}-\d{2}$/.test(fechaRecibida)
  const fecha = new Date(tieneHoraConfirmada || !esFechaSinHora
    ? fechaRecibida
    : `${fechaRecibida}T12:00:00Z`)
  const tieneFechaValida = (tieneHoraConfirmada || esFechaSinHora) && Number.isFinite(fecha.getTime())
  const zonaFecha = tieneHoraConfirmada ? zonaHoraria : 'UTC'
  const estado = partido.estado === 'en-vivo'
    ? 'En vivo'
    : partido.estado === 'finalizado'
      ? 'Finalizado'
      : 'Programado'
  const hayMarcadorConfirmado = partido.estado !== 'programado'
    && Number.isInteger(partido.marcadorLocal)
    && Number.isInteger(partido.marcadorVisitante)
    && (partido.marcadorLocal ?? -1) >= 0
    && (partido.marcadorVisitante ?? -1) >= 0
  const zonaAbreviada = tieneFechaValida
    ? new Intl.DateTimeFormat('es-CO', { timeZone: zonaFecha, timeZoneName: 'short' })
      .formatToParts(fecha)
      .find(parte => parte.type === 'timeZoneName')?.value
    : undefined

  return {
    fecha: tieneFechaValida
      ? new Intl.DateTimeFormat('es-CO', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: zonaFecha
        }).format(fecha)
      : null,
    hora: tieneFechaValida && tieneHoraConfirmada
      ? new Intl.DateTimeFormat('es-CO', {
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zonaHoraria
        }).format(fecha)
      : null,
    referenciaZonaHoraria: tieneFechaValida && tieneHoraConfirmada
      ? [zonaHoraria, zonaAbreviada].filter(Boolean).join(' · ')
      : null,
    competencia: partido.competencia.trim() || null,
    estadio: [partido.estadio?.trim(), partido.ciudad?.trim()].filter(Boolean).join(', ') || null,
    estado,
    resultado: hayMarcadorConfirmado
      ? `${partido.marcadorLocal}–${partido.marcadorVisitante}`
      : null,
    descripcionMarcador: partido.estado === 'programado'
      ? 'Por jugar'
      : 'Marcador aún no disponible'
  }
}
