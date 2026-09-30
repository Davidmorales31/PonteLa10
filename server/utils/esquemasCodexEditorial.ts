import { z } from 'zod'
import { esquemaDocumentoEditorial } from '~/utils/editorial/contenido'

// El estimador editorial usa 220 palabras por minuto: 660 palabras garantizan
// un cuerpo de al menos tres minutos, sin confiar únicamente en el prompt.
export const PALABRAS_MINIMAS_BORRADOR_CODEX = 660
export const CREDITO_PORTADA_IA_CODEX = 'Imagen generada con IA'
export const PIE_PORTADA_IA_CODEX = 'Ilustración editorial generada con IA. No es una fotografía documental del evento.'

const valoresIntencionContenido = [
  'search_utility',
  'breaking',
  'explainer',
  'evergreen',
  'data_story',
  'special',
  'opinion',
  'game_support',
  'social_first',
  'update'
] as const

const esquemaUrlHttps = z.string().url().max(2048).refine(
  valor => new URL(valor).protocol === 'https:',
  'Las fuentes deben usar HTTPS.'
)

export const esquemaPortadaCodex = z.object({
  nombreOriginal: z.string().trim().min(3).max(160),
  tipoMime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  imagenBase64: z.string().min(100).max(5_000_000),
  titulo: z.string().trim().min(2).max(160),
  alt: z.string().trim().min(5).max(240),
  pie: z.string().trim().min(10).max(500),
  credito: z.string().trim().min(10).max(300),
  urlFuente: esquemaUrlHttps.refine((valor) => {
    const url = new URL(valor)
    return url.hostname === 'commons.wikimedia.org'
      && url.pathname.startsWith('/wiki/File:')
  }, 'La foto debe enlazar a su ficha de Wikimedia Commons.'),
  autorFoto: z.string().trim().min(2).max(200),
  licenciaFoto: z.enum(['CC0 1.0', 'CC BY 4.0', 'Dominio público'])
}).strict()

export const esquemaPortadaIACodex = z.object({
  nombreOriginal: z.string().trim().min(3).max(160),
  tipoMime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  imagenBase64: z.string().min(100).max(3_300_000).regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    'La imagen generada debe estar codificada en base64.'
  ),
  titulo: z.string().trim().min(2).max(160),
  alt: z.string().trim().min(5).max(240)
}).strict()

const esquemaFuenteCodex = z.object({
  url: esquemaUrlHttps,
  titulo: z.string().trim().min(5).max(240),
  publisher: z.string().trim().min(2).max(160),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  accessedAt: z.string().datetime({ offset: true }),
  tipo: z.enum(['primaria', 'secundaria']),
  claims: z.array(z.string().trim().min(8).max(500)).min(1).max(12)
}).strict()

function tieneCaracteresDeControl(valor: string) {
  return Array.from(valor).some((caracter) => {
    const punto = caracter.codePointAt(0) ?? 0
    return punto <= 0x1f || (punto >= 0x7f && punto <= 0x9f)
  })
}

export const esquemaPropuestaCodex = z.object({
  idempotencyKey: z.string().uuid(),
  runId: z.string().uuid(),
  categoryId: z.string().uuid(),
  storyFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  title: z.string().trim().min(8).max(160),
  summary: z.string().trim().min(20).max(320),
  contentType: z.enum(['noticia', 'analisis', 'informe', 'opinion', 'especial']),
  contentIntent: z.enum(valoresIntencionContenido),
  body: z.string().trim().min(500).max(30_000),
  bodyJson: esquemaDocumentoEditorial,
  seoTitle: z.string().trim().min(8).max(70),
  seoDescription: z.string().trim().min(20).max(170),
  socialBrief: z.string().trim().min(10).max(300),
  sourceUrl: esquemaUrlHttps,
  sourceName: z.string().trim().min(2).max(160),
  // Toda propuesta de la tarea Codex debe llegar al CMS con portada persistida.
  // Otros flujos conservan su capacidad de crear artículos sin imagen.
  coverMediaId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).max(12),
  newTopics: z.array(z.object({
    name: z.string().trim().min(2).max(80)
      .refine(value => !tieneCaracteresDeControl(value), 'El tema no puede contener caracteres de control.'),
    description: z.string().trim().max(240).default('')
      .refine(value => !tieneCaracteresDeControl(value), 'La descripción no puede contener caracteres de control.')
  }).strict()).max(3),
  relatedArticleIds: z.array(z.string().uuid()).max(3),
  sources: z.array(esquemaFuenteCodex).min(2).max(10),
  editorialFlags: z.array(z.enum([
    'needs_angle_review',
    'insufficient_independent_corroboration',
    'sensitive_claims',
    'licensed_photo_cover',
    'ai_generated_cover'
  ])).max(8)
}).strict().superRefine((propuesta, contexto) => {
  const recogerTexto = (valor: unknown): string => {
    if (!valor || typeof valor !== 'object') return ''
    const nodo = valor as { text?: unknown, content?: unknown }
    const propio = typeof nodo.text === 'string' ? nodo.text : ''
    const hijos = Array.isArray(nodo.content)
      ? nodo.content.map(recogerTexto).filter(Boolean).join(' ')
      : ''
    return [propio, hijos].filter(Boolean).join(' ')
  }
  const textoDocumento = propuesta.bodyJson.content
    .map(recogerTexto)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const textoPlano = propuesta.body.replace(/\s+/g, ' ').trim()
  const cantidadPalabras = textoPlano ? textoPlano.split(' ').length : 0

  if (cantidadPalabras < PALABRAS_MINIMAS_BORRADOR_CODEX) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['body'],
      message: `El cuerpo debe tener al menos ${PALABRAS_MINIMAS_BORRADOR_CODEX} palabras para alcanzar tres minutos de lectura.`
    })
  }

  if (textoDocumento !== textoPlano) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bodyJson'],
      message: 'El documento y el cuerpo de la propuesta deben contener el mismo texto.'
    })
  }

  if (new Set(propuesta.tagIds).size !== propuesta.tagIds.length
    || new Set(propuesta.relatedArticleIds).size !== propuesta.relatedArticleIds.length) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tagIds'],
      message: 'No se permiten temas ni noticias relacionadas duplicadas.'
    })
  }

  if (propuesta.contentIntent === 'update' && propuesta.relatedArticleIds.length === 0) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relatedArticleIds'],
      message: 'Una actualización debe enlazar el artículo existente que modifica.'
    })
  }

  if (!propuesta.sources.some(fuente => fuente.url === propuesta.sourceUrl)) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceUrl'],
      message: 'La fuente principal debe aparecer en las fuentes estructuradas.'
    })
  }

  if (['opinion', 'especial'].includes(propuesta.contentType)
    && !propuesta.editorialFlags.includes('needs_angle_review')) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['editorialFlags'],
      message: 'Opinión y Especiales requieren revisión humana del enfoque.'
    })
  }

  const tieneFotoLicenciada = propuesta.editorialFlags.includes('licensed_photo_cover')
  const tienePortadaIA = propuesta.editorialFlags.includes('ai_generated_cover')

  if (tieneFotoLicenciada === tienePortadaIA) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['editorialFlags'],
      message: 'Cada portada debe indicar exactamente si es una foto licenciada o una ilustración generada con IA.'
    })
  }

})

const esquemaScoresTendencia = z.object({
  recency: z.number().int().min(0).max(100),
  relevance: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  editorialFit: z.number().int().min(0).max(100),
  searchDemand: z.number().int().min(0).max(100),
  lifespan: z.number().int().min(0).max(100),
  socialPotential: z.number().int().min(0).max(100),
  interactivePotential: z.number().int().min(0).max(100),
  firstPartyData: z.number().int().min(0).max(100),
  competitionOpportunity: z.number().int().min(0).max(100)
}).strict()

export const accionesEditorialesCodex = [
  'create_article', 'update_article', 'update_hub', 'create_data_story',
  'create_game_candidate', 'manual_review', 'discard'
] as const

export type AccionEditorialCodex = typeof accionesEditorialesCodex[number]

const tiposRecursoObjetivoEditorial = ['article', 'hub'] as const

export const esquemaOportunidadCodex = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  term: z.string().trim().min(2).max(160),
  titleHint: z.string().trim().min(8).max(220),
  trendUrl: esquemaUrlHttps,
  trendTitle: z.string().trim().min(3).max(240),
  observedAt: z.string().datetime({ offset: true }),
  relevanceReason: z.string().trim().min(30).max(600),
  contentIntent: z.enum(valoresIntencionContenido),
  recommendedAction: z.enum(accionesEditorialesCodex),
  targetResourceId: z.string().uuid().nullable().optional().default(null),
  targetResourceType: z.enum(tiposRecursoObjetivoEditorial).nullable().optional().default(null),
  actionReason: z.string().trim().min(20).max(600),
  scores: esquemaScoresTendencia
}).strict().superRefine((oportunidad, contexto) => {
  const requiereTarget = ['update_article', 'update_hub'].includes(oportunidad.recommendedAction)
  if (requiereTarget && (!oportunidad.targetResourceId || !oportunidad.targetResourceType)) {
    contexto.addIssue({ code: z.ZodIssueCode.custom, path: ['targetResourceId'], message: 'Una actualización requiere un recurso objetivo válido.' })
  }
  if (oportunidad.recommendedAction === 'update_article' && oportunidad.targetResourceType !== 'article'
    || oportunidad.recommendedAction === 'update_hub' && oportunidad.targetResourceType !== 'hub') {
    contexto.addIssue({ code: z.ZodIssueCode.custom, path: ['targetResourceType'], message: 'El tipo de recurso debe coincidir con la acción recomendada.' })
  }
  if (!requiereTarget && (oportunidad.targetResourceId || oportunidad.targetResourceType)) {
    contexto.addIssue({ code: z.ZodIssueCode.custom, path: ['targetResourceId'], message: 'Solo las actualizaciones pueden declarar un recurso objetivo.' })
  }
})

export const esquemaDecisionOportunidadCodex = z.object({
  action: z.enum(accionesEditorialesCodex),
  targetResourceId: z.string().uuid().nullable().optional().default(null),
  targetResourceType: z.enum(tiposRecursoObjetivoEditorial).nullable().optional().default(null),
  reason: z.string().trim().min(20).max(600)
}).strict().superRefine((decision, contexto) => {
  const requiereTarget = ['update_article', 'update_hub'].includes(decision.action)
  if (requiereTarget && (!decision.targetResourceId || !decision.targetResourceType)) {
    contexto.addIssue({ code: z.ZodIssueCode.custom, path: ['targetResourceId'], message: 'Una actualización requiere un recurso objetivo.' })
  }
  if (decision.action === 'update_article' && decision.targetResourceType !== 'article'
    || decision.action === 'update_hub' && decision.targetResourceType !== 'hub') {
    contexto.addIssue({ code: z.ZodIssueCode.custom, path: ['targetResourceType'], message: 'El tipo de recurso debe coincidir con la acción elegida.' })
  }
  if (!requiereTarget && (decision.targetResourceId || decision.targetResourceType)) {
    contexto.addIssue({ code: z.ZodIssueCode.custom, path: ['targetResourceId'], message: 'Solo las actualizaciones admiten recurso objetivo.' })
  }
})

export const esquemaContextoCodex = z.object({
  runId: z.string().uuid()
}).strict()

export const esquemaBorradorCodex = z.object({
  idempotencyKey: z.string().uuid(),
  retryUncertain: z.boolean().default(false),
  runId: z.string().uuid(),
  categoryId: z.string().uuid(),
  storyFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  titleHint: z.string().trim().min(8).max(220),
  contentType: z.enum(['noticia', 'analisis', 'informe', 'opinion', 'especial']),
  contentIntent: z.enum(valoresIntencionContenido),
  researchSummary: z.string().trim().min(80).max(6000),
  trend: z.object({
    term: z.string().trim().min(2).max(160),
    title: z.string().trim().min(3).max(240),
    url: esquemaUrlHttps,
    observedAt: z.string().datetime({ offset: true })
  }).strict(),
  seoResearch: z.object({
    primaryQuery: z.string().trim().min(2).max(160),
    relatedQueries: z.array(z.string().trim().min(2).max(160)).max(8),
    intent: z.enum(['informativa', 'navegacional', 'analisis'])
  }).strict(),
  primarySourceUrl: esquemaUrlHttps,
  sources: z.array(esquemaFuenteCodex).min(2).max(10),
  topicCatalog: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240)
  }).strict()).max(300),
  relatedArticles: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(8).max(160),
    summary: z.string().trim().max(320),
    categoryName: z.string().trim().min(2).max(80)
  }).strict()).max(100)
}).strict().superRefine((entrada, contexto) => {
  const urlFuentePrincipal = entrada.sources.some(fuente => fuente.url === entrada.primarySourceUrl)
  if (!urlFuentePrincipal) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['primarySourceUrl'],
      message: 'La fuente principal debe pertenecer al expediente de investigación.'
    })
  }

  const urlsFuentes = entrada.sources.map(fuente => fuente.url)
  const idsTemas = entrada.topicCatalog.map(tema => tema.id)
  const idsArticulos = entrada.relatedArticles.map(articulo => articulo.id)
  if (new Set(urlsFuentes).size !== urlsFuentes.length
    || new Set(idsTemas).size !== idsTemas.length
    || new Set(idsArticulos).size !== idsArticulos.length) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sources'],
      message: 'El expediente no puede repetir fuentes, temas ni artículos relacionados.'
    })
  }
})

export const esquemaConsultaSaludCodex = z.object({}).strict()

export const esquemaAgendaCodex = z.object({
  runId: z.string().uuid(),
  status: z.enum(['in_progress', 'completed', 'partial', 'failed']),
  categories: z.array(z.object({
    categoryId: z.string().uuid(),
    opportunities: z.array(esquemaOportunidadCodex).max(7),
    omittedReason: z.string().trim().min(20).max(600).optional()
  }).strict()).min(1).max(50)
}).strict().superRefine((agenda, contexto) => {
  const ids = agenda.categories.map(category => category.categoryId)
  if (new Set(ids).size !== ids.length) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categories'],
      message: 'No se permiten checkpoints de categoría repetidos en la misma solicitud.'
    })
  }

  for (const [indice, category] of agenda.categories.entries()) {
    const fingerprints = category.opportunities.map(opportunity => opportunity.fingerprint.toLowerCase())
    if (new Set(fingerprints).size !== fingerprints.length) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categories', indice, 'opportunities'],
        message: 'No se permiten oportunidades repetidas en una categoría.'
      })
    }
  }
})

export type EntradaPropuestaCodex = z.infer<typeof esquemaPropuestaCodex>
