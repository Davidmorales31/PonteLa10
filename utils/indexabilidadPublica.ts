import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

export interface DatosIndexabilidadPartido {
  local: string
  visitante: string
  competencia: string
  fechaIso: string
  estado: string | null
  fuenteOficialUrl: string | null
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  transmisionVerificada?: boolean
}

export interface DatosIndexabilidadHub {
  tipo: 'hub'
  articulosDisponibles: number
  fuenteDisponible: boolean
}

export function evaluarIndexabilidad(
  contenido: DatosIndexabilidadPartido | DatosIndexabilidadHub
): boolean {
  if ('articulosDisponibles' in contenido) {
    return contenido.fuenteDisponible
      && Number.isInteger(contenido.articulosDisponibles)
      && contenido.articulosDisponibles >= 3
  }

  const partido = contenido
  const fechaValida = Number.isFinite(Date.parse(partido.fechaIso))
  const estadoConfirmado = Boolean(partido.estado)
    && etiquetaEstadoSeoPartido(partido.estado) !== 'ACTUALIZACIÓN PENDIENTE'
  const fuenteOficial = esUrlHttps(partido.fuenteOficialUrl)
    || partido.transmisionVerificada === true
  const equiposConfirmados = Boolean(partido.local.trim() && partido.visitante.trim())
  const competenciaConfirmada = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(partido.competencia.trim())
  const resultadoConfirmado = Number.isFinite(partido.golesLocal)
    && Number.isFinite(partido.golesVisitante)
    && (partido.golesLocal ?? -1) >= 0
    && (partido.golesVisitante ?? -1) >= 0
  const sedeConfirmada = Boolean(partido.estadio?.trim())

  return fechaValida
    && estadoConfirmado
    && fuenteOficial
    && equiposConfirmados
    && competenciaConfirmada
    && (resultadoConfirmado || sedeConfirmada || partido.transmisionVerificada === true)
}

function esUrlHttps(valor: string | null): boolean {
  if (!valor) return false
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && url.hostname.toLocaleLowerCase('en-US') === 'dimayor.com.co'
  } catch {
    return false
  }
}
