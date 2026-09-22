import { z } from 'zod'

export const versionContratoEvidenciaIngesta = 1

export const etapasProcesamientoIngesta = [
  'validating_source',
  'reading_metadata',
  'downloading_audio',
  'transcribing',
  'translating',
  'persisting_evidence',
  'completed'
] as const

export const codigosErrorIngesta = [
  'TIKTOK_URL_INVALID',
  'SOURCE_NETWORK_UNSAFE',
  'TIKTOK_VIDEO_TOO_LONG',
  'TIKTOK_DURATION_UNKNOWN',
  'TIKTOK_LANGUAGE_UNSUPPORTED',
  'TIKTOK_NOT_PUBLIC',
  'TIKTOK_UNAVAILABLE',
  'SOURCE_SIZE_LIMIT',
  'INSUFFICIENT_RESOURCES',
  'MODEL_NOT_READY',
  'TRANSCRIPTION_TIMEOUT',
  'TRANSCRIPTION_FAILED',
  'NO_SPEECH_DETECTED',
  'TRANSCRIBER_INVALID_OUTPUT',
  'CONTRACT_VERSION_UNSUPPORTED',
  'TEMP_CLEANUP_FAILED',
  'DEEPSEEK_RATE_LIMIT',
  'DEEPSEEK_TIMEOUT',
  'DEEPSEEK_UNAVAILABLE',
  'DEEPSEEK_INVALID_OUTPUT',
  'PROVIDER_CONFIGURATION_INVALID',
  'BUDGET_LIMIT_REACHED',
  'WORKER_STOPPED',
  'ATTEMPT_DEADLINE_EXCEEDED',
  'ATTEMPTS_EXHAUSTED',
  'LEGACY_REVIEW_REQUIRED',
  'LEASE_LOST',
  'STALE_HEARTBEAT',
  'IDEMPOTENCY_CONFLICT',
  'ACTIVE_URL_CONFLICT',
  'RESULT_ALREADY_EXISTS',
  'LEGACY_PROCESSING_DISABLED'
] as const

const fechaUtc = z.string().datetime({ offset: true })

const numeroTiempo = z.number().finite()

const advertenciaEvidencia = z.object({
  codigo: z.string().trim().min(1).max(80),
  mensaje: z.string().trim().min(1).max(300)
}).strict()

export const esquemaMetadatosFuenteTikTok = z.object({
  plataforma: z.literal('tiktok'),
  videoId: z.string().trim().min(1).max(80),
  urlFuenteFinal: z.string().trim().url().max(2048),
  titulo: z.string().trim().max(500).nullable(),
  autor: z.string().trim().max(160).nullable(),
  creditos: z.string().trim().min(1).max(500),
  duracionSegundos: numeroTiempo.gt(0),
  consultadoEn: fechaUtc
}).strict()

export const esquemaSegmentoOriginalIngesta = z.object({
  id: z.number().int().min(0),
  inicioSegundos: numeroTiempo.min(0),
  finSegundos: numeroTiempo.gt(0),
  texto: z.string().trim().min(1).max(5000)
}).strict().superRefine((segmento, contexto) => {
  if (segmento.finSegundos <= segmento.inicioSegundos) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['finSegundos'],
      message: 'El fin del segmento debe ser posterior al inicio.'
    })
  }
})

export const esquemaTranscripcionOriginalIngesta = z.object({
  idioma: z.enum(['es', 'en']),
  modelo: z.string().trim().min(1).max(80),
  motor: z.literal('faster-whisper'),
  versionMotor: z.string().trim().min(1).max(40),
  segmentos: z.array(esquemaSegmentoOriginalIngesta).min(1).max(2000)
}).strict().superRefine((original, contexto) => {
  const ids = new Set<number>()
  let inicioAnterior = -1
  let caracteres = 0

  original.segmentos.forEach((segmento, indice) => {
    if (ids.has(segmento.id)) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['segmentos', indice, 'id'],
        message: 'Los segmentos no pueden repetir identificadores.'
      })
    }
    ids.add(segmento.id)

    if (segmento.inicioSegundos < inicioAnterior) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['segmentos', indice, 'inicioSegundos'],
        message: 'Los segmentos deben conservar orden temporal ascendente.'
      })
    }
    inicioAnterior = segmento.inicioSegundos
    caracteres += [...segmento.texto].length
  })

  if (caracteres > 50000) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['segmentos'],
      message: 'La transcripción excede 50000 caracteres.'
    })
  }
})

export const esquemaLimpiezaIngesta = z.object({
  completada: z.boolean(),
  archivosTemporalesRestantes: z.number().int().min(0)
}).strict()

export const esquemaResultadoPythonTikTok = z.object({
  metadatos: esquemaMetadatosFuenteTikTok,
  original: esquemaTranscripcionOriginalIngesta,
  limpieza: esquemaLimpiezaIngesta
}).strict()

export const esquemaSegmentoTraducidoIngesta = z.object({
  segmentoId: z.number().int().min(0),
  texto: z.string().trim().min(1).max(5000)
}).strict()

export const esquemaTraduccionIngesta = z.object({
  idioma: z.literal('es'),
  proveedor: z.literal('deepseek'),
  modelo: z.string().trim().min(1).max(100),
  versionInstrucciones: z.string().trim().min(1).max(80),
  segmentos: z.array(esquemaSegmentoTraducidoIngesta).min(1).max(2000),
  consumo: z.object({
    tokensEntrada: z.number().int().min(0),
    tokensSalida: z.number().int().min(0),
    duracionMs: z.number().int().min(0),
    costoEstimadoUsd: z.string().regex(/^\d+(?:\.\d{1,8})?$/).nullable(),
    versionTarifa: z.string().trim().min(1).max(80).nullable()
  }).strict(),
  advertencias: z.array(advertenciaEvidencia).max(20)
}).strict()

export const esquemaEvidenciaIngestaEditorial = z.object({
  versionContrato: z.literal(versionContratoEvidenciaIngesta),
  metadatos: esquemaMetadatosFuenteTikTok,
  original: esquemaTranscripcionOriginalIngesta,
  traduccion: esquemaTraduccionIngesta.nullable(),
  verificacion: z.object({
    estado: z.literal('pendiente'),
    fuentesIndependientes: z.array(z.never()).length(0)
  }).strict(),
  limpieza: esquemaLimpiezaIngesta,
  advertencias: z.array(advertenciaEvidencia).max(20)
}).strict().superRefine((evidencia, contexto) => {
  if (!evidencia.limpieza.completada || evidencia.limpieza.archivosTemporalesRestantes !== 0) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['limpieza'],
      message: 'La evidencia solo se acepta cuando la limpieza temporal terminó sin residuos.'
    })
  }

  if (evidencia.original.idioma === 'es' && evidencia.traduccion !== null) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['traduccion'],
      message: 'Las fuentes en español no deben incluir traducción.'
    })
  }

  if (evidencia.original.idioma === 'en' && evidencia.traduccion === null) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['traduccion'],
      message: 'Las fuentes en inglés requieren traducción al español.'
    })
  }

  const duracion = evidencia.metadatos.duracionSegundos
  evidencia.original.segmentos.forEach((segmento, indice) => {
    if (segmento.finSegundos > duracion + 0.5) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['original', 'segmentos', indice, 'finSegundos'],
        message: 'El segmento excede la duración declarada de la fuente.'
      })
    }
  })

  if (!evidencia.traduccion) return

  const idsOriginales = evidencia.original.segmentos.map(segmento => segmento.id)
  const idsTraducidos = evidencia.traduccion.segmentos.map(segmento => segmento.segmentoId)
  const textoTraducido = evidencia.traduccion.segmentos
    .reduce((total, segmento) => total + [...segmento.texto].length, 0)

  if (textoTraducido > 50000) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['traduccion', 'segmentos'],
      message: 'La traducción excede 50000 caracteres.'
    })
  }

  if (
    idsOriginales.length !== idsTraducidos.length
    || idsOriginales.some((id, indice) => idsTraducidos[indice] !== id)
  ) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['traduccion', 'segmentos'],
      message: 'La traducción debe conservar exactamente los segmentos originales y su orden.'
    })
  }

  const consumo = evidencia.traduccion.consumo
  if (
    (consumo.costoEstimadoUsd === null) !== (consumo.versionTarifa === null)
  ) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['traduccion', 'consumo'],
      message: 'El costo desconocido debe dejar también la versión de tarifa en null.'
    })
  }
})

export const esquemaCheckpointIngesta = z.union([
  z.object({
    versionContrato: z.literal(versionContratoEvidenciaIngesta),
    tipo: z.literal('metadatos'),
    metadatos: esquemaMetadatosFuenteTikTok
  }).strict(),
  z.object({
    versionContrato: z.literal(versionContratoEvidenciaIngesta),
    tipo: z.literal('transcripcion'),
    metadatos: esquemaMetadatosFuenteTikTok,
    original: esquemaTranscripcionOriginalIngesta,
    limpieza: esquemaLimpiezaIngesta
  }).strict()
])

export type ResultadoPythonTikTok = z.infer<typeof esquemaResultadoPythonTikTok>
export type EvidenciaIngestaEditorial = z.infer<typeof esquemaEvidenciaIngestaEditorial>
export type EtapaProcesamientoIngesta = typeof etapasProcesamientoIngesta[number]
export type CodigoErrorIngesta = typeof codigosErrorIngesta[number]

export function construirEvidenciaDesdeResultadoPython(
  resultado: ResultadoPythonTikTok,
  traduccion: z.infer<typeof esquemaTraduccionIngesta> | null
): EvidenciaIngestaEditorial {
  return esquemaEvidenciaIngestaEditorial.parse({
    versionContrato: versionContratoEvidenciaIngesta,
    metadatos: resultado.metadatos,
    original: resultado.original,
    traduccion,
    verificacion: {
      estado: 'pendiente',
      fuentesIndependientes: []
    },
    limpieza: resultado.limpieza,
    advertencias: []
  })
}
