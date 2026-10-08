import {
  evaluarFrescuraPartido,
  evaluarFrescuraTabla,
  type EvaluacionFrescuraDeportiva
} from '~/utils/frescuraDatosDeportivos'

export interface FilaPartidoSaludFrescura {
  competition_slug: string
  status: string | null
  scheduled_at: string
  checked_at: string | null
}

export interface FilaTablaSaludFrescura {
  competition_slug: string
  checked_at: string | null
}

interface ResumenFrescuraPorCompetencia {
  competencia: string
  estado: 'saludable' | 'atencion' | 'sin_datos'
  registros: number
  actualizados: number
  desactualizados: number
  sinVerificacion: number
  ultimaVerificacion: string | null
  edadMayorMinutos: number | null
}

export interface SaludFrescuraFutbol {
  consultadoEn: string
  calendario: ResumenFrescuraPorCompetencia[]
  tablas: ResumenFrescuraPorCompetencia[]
  filasRecibidas: { calendario: number, tablas: number }
  limitesConsulta: { calendario: number, tablas: number }
  coberturaCompleta: boolean
}

const COMPETENCIAS: Record<string, string> = {
  'liga-betplay': 'Liga BetPlay',
  'torneo-betplay': 'Torneo BetPlay',
  'copa-colombia': 'Copa Colombia'
}

export function construirSaludFrescuraFutbol(
  partidos: FilaPartidoSaludFrescura[],
  tablas: FilaTablaSaludFrescura[],
  ahoraMs = Date.now(),
  totalPartidos = partidos.length,
  totalFilasTabla = tablas.length,
  limitePartidos = 1000,
  limiteTablas = 500
): SaludFrescuraFutbol {
  const calendario = Object.keys(COMPETENCIAS).map(competencia => resumirCompetencia(
    competencia,
    partidos.filter(partido => partido.competition_slug === competencia),
    partido => evaluarFrescuraPartido({
      estado: partido.status,
      fechaIso: partido.scheduled_at,
      verificadoEn: partido.checked_at || ''
    }, ahoraMs)
  ))
  const resumenTablas = Object.keys(COMPETENCIAS).map(competencia => resumirCompetencia(
    competencia,
    tablas.filter(fila => fila.competition_slug === competencia),
    fila => evaluarFrescuraTabla(fila.checked_at, ahoraMs)
  ))
  const coberturaCompleta = totalPartidos <= limitePartidos && totalFilasTabla <= limiteTablas

  return {
    consultadoEn: new Date(ahoraMs).toISOString(),
    calendario,
    tablas: resumenTablas,
    filasRecibidas: { calendario: partidos.length, tablas: tablas.length },
    limitesConsulta: { calendario: limitePartidos, tablas: limiteTablas },
    coberturaCompleta
  }
}

function resumirCompetencia<T extends { checked_at: string | null }>(
  slug: string,
  filas: T[],
  evaluar: (fila: T) => EvaluacionFrescuraDeportiva
): ResumenFrescuraPorCompetencia {
  const evaluaciones = filas.map(evaluar)
  const fechas = evaluaciones.map(evaluacion => evaluacion.verificadoEn).filter((fecha): fecha is string => Boolean(fecha))
  const edades = evaluaciones.map(evaluacion => evaluacion.edadMinutos).filter((edad): edad is number => edad !== null)
  const desactualizados = evaluaciones.filter(evaluacion => evaluacion.estado === 'desactualizado').length
  const sinVerificacion = evaluaciones.filter(evaluacion => ['sin_verificar', 'fecha_invalida'].includes(evaluacion.estado)).length
  return {
    competencia: COMPETENCIAS[slug] || slug,
    estado: !filas.length ? 'sin_datos' : desactualizados || sinVerificacion ? 'atencion' : 'saludable',
    registros: filas.length,
    actualizados: evaluaciones.filter(evaluacion => evaluacion.actualizado).length,
    desactualizados,
    sinVerificacion,
    ultimaVerificacion: fechas.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null,
    edadMayorMinutos: edades.length ? Math.max(...edades) : null
  }
}
