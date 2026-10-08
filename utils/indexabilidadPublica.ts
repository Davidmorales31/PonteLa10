import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { evaluarFrescuraPartido, evaluarFrescuraTabla, type EvaluacionFrescuraDeportiva } from '~/utils/frescuraDatosDeportivos'

export interface DatosIndexabilidadPartido {
  local: string
  visitante: string
  competencia: string
  fechaIso: string
  estado: string | null
  verificadoEn: string
  estadoFrescura?: EvaluacionFrescuraDeportiva
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
  entidadesVerificadas?: number
}

export interface DatosIndexabilidadEquipo {
  tipo: 'equipo'
  slug: string
  nombre: string
  competencia: string
  temporada: string
  escudo: string | null
  posicionVerificadaEn: string | null
  partidosPublicos: number
}

export interface DatosIndexabilidadCompeticion {
  tipo: 'competicion'
  slug: string
  nombre: string
  temporada: string
  partidosPublicos: number
  equiposPublicos: number
  fuenteDisponible: boolean
  datosActualizados: boolean
}

export interface DatosIndexabilidadJugador {
  tipo: 'jugador'
  slug: string
  nombre: string
  nacionalidad: string
  club: string
  posicion: string
  competencia: string
  descripcionVerificada: string
  fuenteOficialUrl: string
  verificadoEn: string
}

export function evaluarIndexabilidad(
  contenido: DatosIndexabilidadPartido | DatosIndexabilidadHub | DatosIndexabilidadEquipo | DatosIndexabilidadCompeticion | DatosIndexabilidadJugador,
  ahora = Date.now()
): boolean {
  if ('articulosDisponibles' in contenido) {
    const articulosSuficientes = Number.isInteger(contenido.articulosDisponibles)
      && contenido.articulosDisponibles >= 3
    const entidadesSuficientes = Number.isInteger(contenido.entidadesVerificadas)
      && (contenido.entidadesVerificadas ?? 0) >= 3
    return contenido.fuenteDisponible && (articulosSuficientes || entidadesSuficientes)
  }

  if ('tipo' in contenido && contenido.tipo === 'equipo') {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contenido.slug)
      && contenido.nombre.trim().length >= 2
      && /^(?:liga|torneo)-betplay$/.test(contenido.competencia)
      && /^20\d{2}(?:-[A-Za-z0-9]+)?$/.test(contenido.temporada)
      && Boolean(contenido.escudo && /^\/images\/escudos\/liga-colombiana\/[a-z0-9-]+\.png$/.test(contenido.escudo))
      && Boolean(contenido.posicionVerificadaEn && Number.isFinite(Date.parse(contenido.posicionVerificadaEn)))
      && evaluarFrescuraTabla(contenido.posicionVerificadaEn, ahora).actualizado
      && Number.isInteger(contenido.partidosPublicos)
      && contenido.partidosPublicos >= 3
  }

  if ('tipo' in contenido && contenido.tipo === 'competicion') {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contenido.slug)
      && contenido.nombre.trim().length >= 3
      && /^20\d{2}(?:-[A-Za-z0-9]+)?$/.test(contenido.temporada)
      && contenido.fuenteDisponible
      && Number.isInteger(contenido.partidosPublicos)
      && contenido.partidosPublicos >= 8
      && Number.isInteger(contenido.equiposPublicos)
      && contenido.equiposPublicos >= 6
      && contenido.datosActualizados
  }

  if ('tipo' in contenido && contenido.tipo === 'jugador') {
    const verificadoEn = Date.parse(contenido.verificadoEn)
    const diasDesdeVerificacion = (ahora - verificadoEn) / (24 * 60 * 60 * 1000)
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contenido.slug)
      && contenido.nombre.trim().length >= 3
      && contenido.nacionalidad === 'Colombia'
      && contenido.club.trim().length >= 2
      && contenido.posicion.trim().length >= 3
      && contenido.competencia.trim().length >= 3
      && contenido.descripcionVerificada.trim().length >= 180
      && esFuenteClubOficial(contenido.fuenteOficialUrl)
      && Number.isFinite(verificadoEn)
      && diasDesdeVerificacion >= 0
      && diasDesdeVerificacion <= 90
  }

  const partido = contenido
  const frescuraSuficiente = partido.estadoFrescura?.actualizado
    ?? evaluarFrescuraPartido(partido, ahora).actualizado
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
    && frescuraSuficiente
    && (resultadoConfirmado || sedeConfirmada || partido.transmisionVerificada === true)
}

function esFuenteClubOficial(valor: string): boolean {
  try {
    const url = new URL(valor)
    const host = url.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
    return url.protocol === 'https:'
      && ['fcbayern.com', 'juventus.com', 'galatasaray.org'].some(dominio => host === dominio || host.endsWith(`.${dominio}`))
  } catch {
    return false
  }
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
