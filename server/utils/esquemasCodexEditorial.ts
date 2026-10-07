import { z } from 'zod'
import { esquemaDocumentoEditorial } from '~/utils/editorial/contenido'

// El estimador editorial usa 220 palabras por minuto: 660 palabras garantizan
// un cuerpo de al menos tres minutos, sin confiar únicamente en el prompt.
export const PALABRAS_MINIMAS_BORRADOR_CODEX = 660
export const CREDITO_PORTADA_IA_CODEX = 'Imagen generada con IA'
export const PIE_PORTADA_IA_CODEX = 'Ilustración editorial generada con IA. No es una fotografía documental del evento.'

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

export const esquemaBriefSeoPropuestoCodex = z.object({
  targetQuery: z.string().trim().min(2).max(160).nullable(),
  searchIntent: z.enum([
    'actualidad', 'resultado', 'transmision', 'calendario',
    'explicacion', 'perfil', 'analisis', 'opinion'
  ]).nullable(),
  parentCluster: z.string().trim().min(1).max(120).nullable(),
  freshnessWindowDays: z.number().int().min(0).max(3650).nullable(),
  opportunitySource: esquemaUrlHttps.nullable(),
  editorialDifferentiator: z.string().trim().min(1).max(500).nullable()
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
  body: z.string().trim().min(500).max(30_000),
  bodyJson: esquemaDocumentoEditorial,
  seoTitle: z.string().trim().min(8).max(70),
  seoDescription: z.string().trim().min(20).max(170),
  socialBrief: z.string().trim().min(10).max(300),
  sourceUrl: esquemaUrlHttps,
  sourceName: z.string().trim().min(2).max(160),
  // La portada es opcional cuando no hay una foto reutilizable acreditada.
  coverMediaId: z.string().uuid().nullable(),
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

  const tieneMarcaPortada = tieneFotoLicenciada || tienePortadaIA
  if (propuesta.coverMediaId === null ? tieneMarcaPortada : tieneFotoLicenciada === tienePortadaIA) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['editorialFlags'],
      message: 'Una portada requiere una sola marca compatible; sin portada no se permiten marcas de imagen.'
    })
  }

})

const esquemaScoresTendenciaV1 = z.object({
  recency: z.number().int().min(0).max(100),
  relevance: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  editorialFit: z.number().int().min(0).max(100)
}).strict()

const esquemaUrlPublicaPont3la10 = esquemaUrlHttps.refine((valor) => {
  const url = new URL(valor)
  return ['pont3la10.com', 'www.pont3la10.com'].includes(url.hostname)
    && !url.search && !url.hash
}, 'La URL debe ser una página canónica pública de Pont3la10.')

const esquemaEvaluacionOportunidadCodex = z.object({
  recommendation: z.enum(['create', 'update', 'merge', 'expand', 'discard']),
  targetUrl: z.string().trim().max(2048).regex(
    /^\/(articulos|jugadores|equipos|competiciones|partidos)\/[a-z0-9]+(?:-[a-z0-9]+)*$/
  ).nullable(),
  entityMatch: z.object({
    type: z.enum(['player', 'team', 'competition', 'match']),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
    name: z.string().trim().min(2).max(160)
  }).strict().nullable(),
  cannibalizationRisk: z.enum(['none', 'low', 'medium', 'high']),
  similarArticleIds: z.array(z.string().uuid()).max(3),
  addsNewValue: z.boolean(),
  noveltyRationale: z.string().trim().min(30).max(600),
  differentiator: z.string().trim().min(30).max(500),
  searchConsoleEvidence: z.object({
    query: z.string().trim().min(1).max(500),
    pageUrl: esquemaUrlPublicaPont3la10,
    reportPeriodEnd: z.string().date()
  }).strict().nullable()
}).strict()

const pesosScoringEditorial = {
  demandSignal: 25,
  clusterProximity: 20,
  existingEntity: 10,
  novelty: 15,
  searchConsoleOpportunity: 10,
  differentialValue: 15,
  updateability: 5
} as const

export function calcularPrioridadEditorialCodex(scores: {
  demandSignal: number
  clusterProximity: number
  existingEntity: number
  novelty: number
  searchConsoleOpportunity: number | null
  differentialValue: number
  updateability: number
}): number {
  const puntuacionPonderada = scores.demandSignal * pesosScoringEditorial.demandSignal
    + scores.clusterProximity * pesosScoringEditorial.clusterProximity
    + scores.existingEntity * pesosScoringEditorial.existingEntity
    + scores.novelty * pesosScoringEditorial.novelty
    + (scores.searchConsoleOpportunity ?? 0) * pesosScoringEditorial.searchConsoleOpportunity
    + scores.differentialValue * pesosScoringEditorial.differentialValue
    + scores.updateability * pesosScoringEditorial.updateability
  const pesoDisponible = scores.searchConsoleOpportunity === null
    ? 100 - pesosScoringEditorial.searchConsoleOpportunity
    : 100
  return Math.round(puntuacionPonderada / pesoDisponible)
}

const esquemaScoresTendenciaV2 = z.object({
  demandSignal: z.number().int().min(0).max(100),
  clusterProximity: z.number().int().min(0).max(100),
  existingEntity: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  searchConsoleOpportunity: z.number().int().min(0).max(100).nullable(),
  differentialValue: z.number().int().min(0).max(100),
  updateability: z.number().int().min(0).max(100),
  priorityScore: z.number().int().min(0).max(100)
}).strict()

const esquemaOportunidadCodexV1 = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  term: z.string().trim().min(2).max(160),
  titleHint: z.string().trim().min(8).max(220),
  trendUrl: esquemaUrlHttps,
  trendTitle: z.string().trim().min(3).max(240),
  observedAt: z.string().datetime({ offset: true }),
  relevanceReason: z.string().trim().min(30).max(600),
  scores: esquemaScoresTendenciaV1
}).strict()

const esquemaOportunidadCodexV2 = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  term: z.string().trim().min(2).max(160),
  titleHint: z.string().trim().min(8).max(220),
  trendUrl: esquemaUrlHttps,
  trendTitle: z.string().trim().min(3).max(240),
  observedAt: z.string().datetime({ offset: true }),
  relevanceReason: z.string().trim().min(30).max(600),
  scores: esquemaScoresTendenciaV2,
  assessment: esquemaEvaluacionOportunidadCodex
}).strict().superRefine((oportunidad, contexto) => {
  const { scores, assessment } = oportunidad
  const evidenciaSearchConsole = assessment.searchConsoleEvidence

  if (scores.priorityScore !== calcularPrioridadEditorialCodex(scores)) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scores', 'priorityScore'],
      message: 'El puntaje total debe corresponder a los componentes y sus pesos.'
    })
  }
  if ((scores.searchConsoleOpportunity === null) !== (evidenciaSearchConsole === null)) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'searchConsoleEvidence'],
      message: 'La puntuación de Search Console requiere evidencia real asociada, y viceversa.'
    })
  }
  if (assessment.entityMatch === null && scores.existingEntity !== 0) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scores', 'existingEntity'],
      message: 'Sin una entidad incluida en el contexto, la puntuación de entidad debe ser cero.'
    })
  }
  if (assessment.recommendation === 'create' && assessment.targetUrl !== null) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'targetUrl'],
      message: 'Una recomendación para crear no puede señalar una URL de destino existente.'
    })
  }
  if (assessment.recommendation === 'create'
    && (assessment.cannibalizationRisk === 'high' || scores.updateability >= 60)) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'recommendation'],
      message: 'No se debe crear una URL nueva con canibalización alta o una oportunidad fuerte de actualización existente.'
    })
  }
  if (assessment.recommendation !== 'discard' && !assessment.addsNewValue) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'addsNewValue'],
      message: 'Solo se puede continuar si la evaluación confirma valor editorial nuevo.'
    })
  }
  if (['update', 'merge', 'expand'].includes(assessment.recommendation)
    && assessment.targetUrl === null) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'targetUrl'],
      message: 'Actualizar, fusionar o ampliar requiere una URL existente como destino.'
    })
  }
  if (['update', 'merge'].includes(assessment.recommendation)
    && !assessment.targetUrl?.startsWith('/articulos/')) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'targetUrl'],
      message: 'Actualizar o fusionar contenido requiere una URL de artículo existente.'
    })
  }
  if (['medium', 'high'].includes(assessment.cannibalizationRisk)
    && assessment.similarArticleIds.length === 0) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'similarArticleIds'],
      message: 'Un riesgo de canibalización medio o alto debe identificar al menos una publicación similar.'
    })
  }
  if (assessment.recommendation === 'expand' && assessment.entityMatch) {
    const prefijo = {
      player: '/jugadores/',
      team: '/equipos/',
      competition: '/competiciones/',
      match: '/partidos/'
    }[assessment.entityMatch.type]
    if (assessment.targetUrl !== `${prefijo}${assessment.entityMatch.slug}`) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assessment', 'targetUrl'],
        message: 'Ampliar una entidad requiere enlazar la página de esa entidad exacta.'
      })
    }
  }
  if (assessment.recommendation === 'expand' && assessment.targetUrl
    && !assessment.targetUrl.startsWith('/articulos/') && assessment.entityMatch === null) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'entityMatch'],
      message: 'Ampliar una página de entidad requiere identificar esa entidad del contexto.'
    })
  }

  if (new Set(assessment.similarArticleIds.map(id => id.toLowerCase())).size !== assessment.similarArticleIds.length) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assessment', 'similarArticleIds'],
      message: 'No se pueden repetir artículos similares.'
    })
  }
})

const esquemaOportunidadCodex = z.union([
  esquemaOportunidadCodexV2,
  esquemaOportunidadCodexV1
])

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
    intent: z.enum([
      'informativa', 'navegacional', 'analisis', 'actualidad', 'resultado',
      'transmision', 'calendario', 'explicacion', 'perfil', 'opinion'
    ])
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
