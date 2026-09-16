import { z } from 'zod'
import type {
  EstadoIngestaEditorial,
  PlataformaIngestaEditorial
} from '~/types/ingestaEditorial'
import {
  tiposContenidoEditorial
} from '~/utils/editorial/contenido'

export const estadosIngestaEditorial: EstadoIngestaEditorial[] = [
  'pending',
  'queued',
  'processing',
  'evidence_ready',
  'draft_created',
  'failed',
  'cancelled'
]

export const plataformasIngestaEditorial: PlataformaIngestaEditorial[] = [
  'web',
  'youtube',
  'tiktok',
  'instagram',
  'x',
  'facebook'
]

export const etiquetasEstadoIngesta: Record<EstadoIngestaEditorial, string> = {
  pending: 'Pendiente',
  queued: 'En cola',
  processing: 'Procesando',
  evidence_ready: 'Evidencia lista',
  draft_created: 'Borrador creado',
  failed: 'Requiere atención',
  cancelled: 'Cancelada'
}

export const etiquetasPlataformaIngesta: Record<PlataformaIngestaEditorial, string> = {
  web: 'Sitio web',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook'
}

const parametrosSeguimiento = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref_src',
  'ref_url',
  'si'
])

const hostsLocales = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '::1'
])

export interface FuenteNormalizadaEditorial {
  urlNormalizada: string
  hostFuente: string
  plataforma: PlataformaIngestaEditorial
}

function perteneceAlDominio(host: string, dominio: string): boolean {
  return host === dominio || host.endsWith(`.${dominio}`)
}

function detectarPlataforma(host: string): PlataformaIngestaEditorial {
  if (
    perteneceAlDominio(host, 'youtube.com')
    || perteneceAlDominio(host, 'youtu.be')
  ) return 'youtube'
  if (perteneceAlDominio(host, 'tiktok.com')) return 'tiktok'
  if (perteneceAlDominio(host, 'instagram.com')) return 'instagram'
  if (
    perteneceAlDominio(host, 'x.com')
    || perteneceAlDominio(host, 'twitter.com')
  ) return 'x'
  if (
    perteneceAlDominio(host, 'facebook.com')
    || perteneceAlDominio(host, 'fb.watch')
  ) return 'facebook'
  return 'web'
}

function esHostNoPublico(host: string): boolean {
  const sinCorchetes = host.replace(/^\[|\]$/g, '')

  return hostsLocales.has(sinCorchetes)
    || sinCorchetes.endsWith('.localhost')
    || sinCorchetes.endsWith('.local')
    || sinCorchetes.endsWith('.internal')
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(sinCorchetes)
    || sinCorchetes.includes(':')
    || !sinCorchetes.includes('.')
}

export function normalizarUrlFuenteEditorial(valor: string): FuenteNormalizadaEditorial {
  let url: URL

  try {
    url = new URL(valor.trim())
  } catch {
    throw new Error('Ingresa una URL válida y completa.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('La fuente debe usar HTTP o HTTPS.')
  }

  if (url.username || url.password) {
    throw new Error('La URL no puede incluir credenciales.')
  }

  const hostFuente = url.hostname.toLowerCase().replace(/\.$/, '')

  if (esHostNoPublico(hostFuente)) {
    throw new Error('La fuente debe pertenecer a un host público.')
  }

  url.protocol = 'https:'
  url.hostname = hostFuente
  url.hash = ''

  const parametros = [...url.searchParams.entries()]
    .filter(([clave]) => (
      !clave.toLowerCase().startsWith('utm_')
      && !parametrosSeguimiento.has(clave.toLowerCase())
    ))
    .sort(([claveA, valorA], [claveB, valorB]) => (
      claveA.localeCompare(claveB) || valorA.localeCompare(valorB)
    ))

  url.search = ''
  parametros.forEach(([clave, valorParametro]) => {
    url.searchParams.append(clave, valorParametro)
  })

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/, '')
  }

  return {
    urlNormalizada: url.toString(),
    hostFuente,
    plataforma: detectarPlataforma(hostFuente)
  }
}

const esquemaUrlFuente = z.string()
  .trim()
  .min(12)
  .max(2048)
  .superRefine((valor, contexto) => {
    try {
      normalizarUrlFuenteEditorial(valor)
    } catch (error) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'La URL no es válida.'
      })
    }
  })

export const esquemaCrearIngestaEditorial = z.object({
  urlFuente: esquemaUrlFuente,
  tituloSugerido: z.string().trim().max(160).optional().default(''),
  instrucciones: z.string().trim().max(1000).optional().default(''),
  categoriaId: z.string().uuid().nullable().optional().default(null),
  reglas: z.object({
    tipoContenido: z.union([
      z.literal('auto'),
      z.enum(tiposContenidoEditorial as [
        (typeof tiposContenidoEditorial)[number],
        ...(typeof tiposContenidoEditorial)[number][]
      ])
    ]).default('auto'),
    conservarVideo: z.boolean().default(true),
    exigirCreditos: z.boolean().default(true),
    generarSeo: z.boolean().default(true),
    idioma: z.literal('es-CO').default('es-CO')
  }).default({
    tipoContenido: 'auto',
    conservarVideo: true,
    exigirCreditos: true,
    generarSeo: true,
    idioma: 'es-CO'
  })
})

export const esquemaFiltrosIngestasEditoriales = z.object({
  buscar: z.string().trim().max(120).optional().default(''),
  estado: z.enum(estadosIngestaEditorial as [
    EstadoIngestaEditorial,
    ...EstadoIngestaEditorial[]
  ]).optional(),
  plataforma: z.enum(plataformasIngestaEditorial as [
    PlataformaIngestaEditorial,
    ...PlataformaIngestaEditorial[]
  ]).optional(),
  pagina: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limite: z.coerce.number().int().min(10).max(50).optional().default(20)
})

export const esquemaAccionIngestaEditorial = z.object({
  accion: z.enum(['cancelar', 'reencolar'])
})

export const esquemaConfirmacionEliminacionIngesta = z.object({
  confirmacion: z.literal('ELIMINAR')
})

export const esquemaIdIngestaEditorial = z.string().uuid()
