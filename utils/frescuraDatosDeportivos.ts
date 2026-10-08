import { etiquetaEstadoSeoPartido, normalizarEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

export type EstadoFrescuraDeportiva = 'actualizado' | 'desactualizado' | 'sin_verificar' | 'fecha_invalida' | 'estable'
export type TipoFrescuraDeportiva = 'en_vivo' | 'prepartido' | 'calendario' | 'aplazado' | 'tabla'

export interface EvaluacionFrescuraDeportiva {
  estado: EstadoFrescuraDeportiva
  actualizado: boolean
  verificadoEn: string | null
  edadMinutos: number | null
  umbralMinutos: number | null
}

export interface PartidoParaEvaluarFrescura {
  estado: string | null
  fechaIso: string
  verificadoEn: string
}

export interface FilaParaEvaluarFrescuraTabla {
  verificadoEn: string
}

const UMBRALES_FRESCURA_MINUTOS: Record<TipoFrescuraDeportiva, number> = {
  en_vivo: 3,
  prepartido: 30,
  calendario: 36 * 60,
  aplazado: 90,
  tabla: 60
}

const VENTANA_PREPARTIDO_MS = 90 * 60_000
const TOLERANCIA_RELOJ_FUTURO_MS = 5 * 60_000
const ESTADOS_TERMINALES = new Set(['FINALIZADO', 'CANCELADO', 'ABANDONADO'])

export function evaluarFrescuraPartido(
  partido: PartidoParaEvaluarFrescura,
  ahoraMs = Date.now()
): EvaluacionFrescuraDeportiva {
  const estadoNormalizado = normalizarEstadoSeoPartido(partido.estado, partido.fechaIso, partido.verificadoEn, ahoraMs)
  const estado = etiquetaEstadoSeoPartido(estadoNormalizado)
  if (ESTADOS_TERMINALES.has(estado)) {
    return evaluarFechaVerificacion(partido.verificadoEn, null, ahoraMs, true)
  }
  if (!partido.estado?.trim() || estado === 'ACTUALIZACIÓN PENDIENTE') {
    const fecha = evaluarFechaVerificacion(partido.verificadoEn, UMBRALES_FRESCURA_MINUTOS.en_vivo, ahoraMs)
    return fecha.estado === 'sin_verificar' || fecha.estado === 'fecha_invalida'
      ? fecha
      : { ...fecha, estado: 'desactualizado', actualizado: false }
  }

  const fechaEvento = Date.parse(partido.fechaIso)
  const distanciaEvento = fechaEvento - ahoraMs
  let tipo: TipoFrescuraDeportiva = 'calendario'

  if (['APLAZADO', 'SUSPENDIDO', 'REPROGRAMADO'].includes(estado)) {
    tipo = 'aplazado'
  } else if (estado === 'EN VIVO'
    || (Number.isFinite(fechaEvento) && distanciaEvento <= 0
      && distanciaEvento >= -4 * 60 * 60_000)) {
    tipo = 'en_vivo'
  } else if (Number.isFinite(fechaEvento) && distanciaEvento <= VENTANA_PREPARTIDO_MS) {
    tipo = 'prepartido'
  }

  return evaluarFechaVerificacion(
    partido.verificadoEn,
    UMBRALES_FRESCURA_MINUTOS[tipo],
    ahoraMs
  )
}

export function evaluarFrescuraTabla(
  verificadoEn: string | null | undefined,
  ahoraMs = Date.now()
): EvaluacionFrescuraDeportiva {
  return evaluarFechaVerificacion(
    verificadoEn,
    UMBRALES_FRESCURA_MINUTOS.tabla,
    ahoraMs
  )
}

export function evaluarFrescuraTemporada(
  partidos: PartidoParaEvaluarFrescura[],
  filasTabla: FilaParaEvaluarFrescuraTabla[],
  esTemporadaActual: boolean,
  ahoraMs = Date.now()
): EvaluacionFrescuraDeportiva {
  const partidosActivos = partidos.filter((partido) => {
    const estado = etiquetaEstadoSeoPartido(partido.estado)
    return !ESTADOS_TERMINALES.has(estado)
  })
  const evaluaciones = partidosActivos.map(partido => evaluarFrescuraPartido(partido, ahoraMs))
  if (esTemporadaActual) {
    evaluaciones.push(...filasTabla.map(fila => evaluarFrescuraTabla(fila.verificadoEn, ahoraMs)))
  }

  if (!evaluaciones.length) {
    const ultimaVerificacion = [...partidos, ...filasTabla]
      .map(dato => dato.verificadoEn)
      .filter((fecha): fecha is string => typeof fecha === 'string' && Number.isFinite(Date.parse(fecha)))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null
    return evaluarFechaVerificacion(ultimaVerificacion, null, ahoraMs, true)
  }

  return resumirEvaluaciones(evaluaciones)
}

export function resumirFrescuraTabla(
  filas: FilaParaEvaluarFrescuraTabla[],
  ahoraMs = Date.now()
): EvaluacionFrescuraDeportiva {
  if (!filas.length) return evaluarFechaVerificacion(null, UMBRALES_FRESCURA_MINUTOS.tabla, ahoraMs)
  return resumirEvaluaciones(filas.map(fila => evaluarFrescuraTabla(fila.verificadoEn, ahoraMs)))
}

export function evaluarFechaVerificacion(
  verificadoEn: string | null | undefined,
  umbralMinutos: number | null,
  ahoraMs = Date.now(),
  estable = false
): EvaluacionFrescuraDeportiva {
  if (!verificadoEn) {
    return { estado: 'sin_verificar', actualizado: false, verificadoEn: null, edadMinutos: null, umbralMinutos }
  }
  const fechaMs = Date.parse(verificadoEn)
  if (!Number.isFinite(fechaMs) || fechaMs > ahoraMs + TOLERANCIA_RELOJ_FUTURO_MS) {
    return { estado: 'fecha_invalida', actualizado: false, verificadoEn: null, edadMinutos: null, umbralMinutos }
  }
  const edadMs = Math.max(0, ahoraMs - fechaMs)
  const edadMinutos = Math.floor(edadMs / 60_000)
  if (estable) {
    return { estado: 'estable', actualizado: true, verificadoEn: new Date(fechaMs).toISOString(), edadMinutos, umbralMinutos: null }
  }
  const actualizado = umbralMinutos !== null && edadMs <= umbralMinutos * 60_000
  return {
    estado: actualizado ? 'actualizado' : 'desactualizado',
    actualizado,
    verificadoEn: new Date(fechaMs).toISOString(),
    edadMinutos,
    umbralMinutos
  }
}

function resumirEvaluaciones(evaluaciones: EvaluacionFrescuraDeportiva[]): EvaluacionFrescuraDeportiva {
  const ordenEstados: EstadoFrescuraDeportiva[] = ['fecha_invalida', 'sin_verificar', 'desactualizado', 'actualizado', 'estable']
  const peorEstado = ordenEstados.find(estado => evaluaciones.some(evaluacion => evaluacion.estado === estado)) || 'sin_verificar'
  const verificados = evaluaciones.map(evaluacion => evaluacion.verificadoEn).filter((fecha): fecha is string => Boolean(fecha))
  const ultimaVerificacion = verificados.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null
  const conEdad = evaluaciones.map(evaluacion => evaluacion.edadMinutos).filter((edad): edad is number => edad !== null)
  const umbrales = evaluaciones.map(evaluacion => evaluacion.umbralMinutos).filter((umbral): umbral is number => umbral !== null)
  return {
    estado: peorEstado,
    actualizado: evaluaciones.every(evaluacion => evaluacion.actualizado),
    verificadoEn: ultimaVerificacion,
    edadMinutos: conEdad.length ? Math.max(...conEdad) : null,
    umbralMinutos: umbrales.length ? Math.min(...umbrales) : null
  }
}
