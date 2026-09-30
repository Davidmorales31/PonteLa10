import { describe, expect, it } from 'vitest'
import { esquemaBorradorCodex } from '~/server/utils/esquemasCodexEditorial'

const categoryId = '00000000-0000-4000-8000-000000000001'
const topicId = '00000000-0000-4000-8000-000000000002'
const articleId = '00000000-0000-4000-8000-000000000003'
const accessedAt = '2026-09-26T18:00:00.000Z'

const expediente = {
  idempotencyKey: '00000000-0000-4000-8000-000000000004',
  runId: '00000000-0000-4000-8000-000000000005',
  categoryId,
  storyFingerprint: 'a'.repeat(64),
  titleHint: 'La noticia confirmada que cambia el panorama',
  contentType: 'noticia' as const,
  contentIntent: 'breaking' as const,
  researchSummary: 'Una investigación documentada con contexto, cronología y datos verificables. '.repeat(2),
  trend: {
    term: 'selección Colombia',
    title: 'Tendencias de búsqueda en Colombia',
    url: 'https://trends.google.com/trending?geo=CO',
    observedAt: accessedAt
  },
  seoResearch: {
    primaryQuery: 'selección Colombia',
    relatedQueries: ['convocados selección Colombia'],
    intent: 'informativa' as const
  },
  primarySourceUrl: 'https://example.com/noticia-principal',
  sources: [
    {
      url: 'https://example.com/noticia-principal',
      titulo: 'El comunicado oficial sobre la selección',
      publisher: 'Federación Colombiana',
      publishedAt: null,
      accessedAt,
      tipo: 'primaria' as const,
      claims: ['La federación publicó la convocatoria oficial del equipo.']
    },
    {
      url: 'https://example.org/contexto-independiente',
      titulo: 'Análisis independiente de la convocatoria',
      publisher: 'Medio deportivo',
      publishedAt: null,
      accessedAt,
      tipo: 'secundaria' as const,
      claims: ['El informe explica el contexto de los cambios en la nómina.']
    }
  ],
  topicCatalog: [{ id: topicId, name: 'Selección Colombia', description: 'Noticias del equipo nacional.' }],
  relatedArticles: [{ id: articleId, title: 'El camino de Colombia al torneo', summary: 'Contexto del equipo nacional.', categoryName: 'Fútbol colombiano' }]
}

describe('contrato de borrador editorial Codex', () => {
  it('acepta un expediente de fuentes y deja el reintento incierto apagado por defecto', () => {
    const resultado = esquemaBorradorCodex.safeParse(expediente)

    expect(resultado.success).toBe(true)
    if (resultado.success) expect(resultado.data.retryUncertain).toBe(false)
  })

  it('exige que la fuente primaria declarada pertenezca al expediente', () => {
    const resultado = esquemaBorradorCodex.safeParse({
      ...expediente,
      primarySourceUrl: 'https://example.net/otra-fuente'
    })

    expect(resultado.success).toBe(false)
  })

  it('rechaza una intención ausente o fuera del enum contractual', () => {
    const { contentIntent: _intencion, ...sinIntencion } = expediente
    expect(esquemaBorradorCodex.safeParse(sinIntencion).success).toBe(false)
    expect(esquemaBorradorCodex.safeParse({
      ...expediente,
      contentIntent: 'viral'
    }).success).toBe(false)
  })

  it('rechaza fuentes, temas o artículos repetidos y campos no contratados', () => {
    expect(esquemaBorradorCodex.safeParse({
      ...expediente,
      sources: [expediente.sources[0], expediente.sources[0]]
    }).success).toBe(false)
    expect(esquemaBorradorCodex.safeParse({
      ...expediente,
      topicCatalog: [expediente.topicCatalog[0], expediente.topicCatalog[0]]
    }).success).toBe(false)
    expect(esquemaBorradorCodex.safeParse({
      ...expediente,
      articleTextFromPrompt: 'instrucción no permitida'
    }).success).toBe(false)
  })
})
