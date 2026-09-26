import { z } from 'zod'
import { esquemaDocumentoEditorial } from '~/utils/editorial/contenido'

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
  pie: z.string().trim().min(20).max(500).default('Ilustración editorial generada con IA.')
    .refine(texto => /ilustraci[oó]n editorial/i.test(texto)),
  credito: z.string().trim().min(10).max(300).default('Pont3la10 · Imagen generada con IA')
    .refine(texto => /generad[ao].{0,15}ia|ia.{0,15}generad[ao]/i.test(texto))
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
  body: z.string().trim().min(500).max(30_000),
  bodyJson: esquemaDocumentoEditorial,
  seoTitle: z.string().trim().min(8).max(70),
  seoDescription: z.string().trim().min(20).max(170),
  socialBrief: z.string().trim().min(10).max(300),
  sourceUrl: esquemaUrlHttps,
  sourceName: z.string().trim().min(2).max(160),
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
    'illustrative_cover'
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

  if (!propuesta.editorialFlags.includes('illustrative_cover')) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['editorialFlags'],
      message: 'La portada generada debe quedar marcada como ilustración editorial.'
    })
  }
})

const esquemaScoresTendencia = z.object({
  recency: z.number().int().min(0).max(100),
  relevance: z.number().int().min(0).max(100),
  novelty: z.number().int().min(0).max(100),
  editorialFit: z.number().int().min(0).max(100)
}).strict()

const esquemaOportunidadCodex = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  term: z.string().trim().min(2).max(160),
  titleHint: z.string().trim().min(8).max(220),
  trendUrl: esquemaUrlHttps,
  trendTitle: z.string().trim().min(3).max(240),
  observedAt: z.string().datetime({ offset: true }),
  relevanceReason: z.string().trim().min(30).max(600),
  scores: esquemaScoresTendencia
}).strict()

export const esquemaContextoCodex = z.object({
  runId: z.string().uuid()
}).strict()

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
