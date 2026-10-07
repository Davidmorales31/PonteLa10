import { describe, expect, it } from 'vitest'
import {
  calcularPrioridadEditorialCodex,
  esquemaOportunidadCodexV1,
  esquemaOportunidadCodexV2
} from '~/server/utils/esquemasCodexEditorial'
import {
  proyectarOportunidadesEditorialesCodex,
  type ArticuloPublicadoOportunidad,
  type FilaAgendaEditorialCodex
} from '~/server/utils/proyectarOportunidadesEditorialesCodex'

const categoriaId = 'ae25e2bf-3cee-41d0-9962-4c4b66f83d3f'
const articleId = '1280b817-4591-4484-a3cb-6bdf50d74599'
const huellaCrear = 'a'.repeat(64)
const huellaActualizar = 'b'.repeat(64)
const huellaLegacy = 'c'.repeat(64)

function crearOportunidadV2(
  recommendation: 'create' | 'update' | 'merge' | 'expand' | 'discard',
  fingerprint: string,
  targetUrl: string | null
) {
  const scores = {
    demandSignal: 80,
    clusterProximity: 60,
    existingEntity: 0,
    novelty: 70,
    searchConsoleOpportunity: null,
    differentialValue: 70,
    updateability: recommendation === 'create' ? 20 : 80
  }
  return {
    fingerprint,
    term: 'liga colombiana hoy',
    titleHint: recommendation === 'create'
      ? 'La agenda nueva de la liga colombiana'
      : 'La actualización de la liga colombiana',
    trendUrl: 'https://example.com/tendencia',
    trendTitle: 'Una tendencia deportiva vigente',
    observedAt: '2026-10-07T10:00:00-05:00',
    relevanceReason: 'Hay una noticia nueva y verificable para la audiencia colombiana.',
    scores: {
      ...scores,
      priorityScore: calcularPrioridadEditorialCodex(scores)
    },
    assessment: {
      recommendation,
      targetUrl,
      entityMatch: null,
      cannibalizationRisk: recommendation === 'create' ? 'none' : 'medium',
      similarArticleIds: recommendation === 'create' ? [] : [articleId],
      addsNewValue: recommendation !== 'discard',
      noveltyRationale: 'La actualización contrasta novedades verificables con la cobertura publicada existente.',
      differentiator: 'La pieza añade un análisis propio y contexto específico para lectores de Colombia.',
      searchConsoleEvidence: null
    }
  }
}

function crearFila(fingerprint: string, candidate: unknown): FilaAgendaEditorialCodex {
  return {
    category_id: categoriaId,
    story_fingerprint: fingerprint,
    candidate,
    updated_at: '2026-10-07T15:00:00.000Z'
  }
}

function articulo(slug: string): ArticuloPublicadoOportunidad {
  return { id: articleId, slug, title: 'Cobertura publicada de la liga colombiana' }
}

describe('proyectarOportunidadesEditorialesCodex', () => {
  it('muestra destino, artículos similares y borrador sin modificar sus estados', () => {
    const salida = proyectarOportunidadesEditorialesCodex(
      [crearFila(huellaActualizar, crearOportunidadV2('update', huellaActualizar, '/articulos/liga-colombiana'))],
      new Map([[categoriaId, 'Fútbol colombiano']]),
      new Map([[articleId, articulo('liga-colombiana')]]),
      new Map([['liga-colombiana', articulo('liga-colombiana')]]),
      new Map([[`${categoriaId}:${huellaActualizar}`, {
        ...articulo('borrador-liga'),
        status: 'review'
      }]])
    )

    expect(salida.candidatasInvalidas).toBe(0)
    expect(salida.oportunidades).toHaveLength(1)
    expect(salida.oportunidades[0]).toMatchObject({
      recommendation: 'update',
      targetUrl: '/articulos/liga-colombiana',
      targetArticle: { slug: 'liga-colombiana' },
      cannibalizationRisk: 'medium',
      similarArticles: [{ id: articleId }],
      proposalArticle: { status: 'review', slug: 'borrador-liga' }
    })
  })

  it('ordena actualizar antes de crear y deja candidatas v1 como pendientes', () => {
    const v1 = {
      fingerprint: huellaLegacy,
      term: 'fútbol colombiano',
      titleHint: 'Una oportunidad histórica del fútbol',
      trendUrl: 'https://example.com/historia',
      trendTitle: 'Historia deportiva vigente',
      observedAt: '2026-10-07T10:00:00-05:00',
      relevanceReason: 'La historia tiene una relación actual con la audiencia nacional.',
      scores: { recency: 70, relevance: 80, novelty: 60, editorialFit: 75 }
    }
    expect(esquemaOportunidadCodexV1.safeParse(v1).success).toBe(true)
    expect(esquemaOportunidadCodexV2.safeParse(
      crearOportunidadV2('create', huellaCrear, null)
    ).success).toBe(true)

    const salida = proyectarOportunidadesEditorialesCodex(
      [
        crearFila(huellaCrear, crearOportunidadV2('create', huellaCrear, null)),
        crearFila(huellaLegacy, v1),
        crearFila(huellaActualizar, crearOportunidadV2('update', huellaActualizar, '/articulos/liga-colombiana'))
      ],
      new Map([[categoriaId, 'Fútbol colombiano']]),
      new Map([[articleId, articulo('liga-colombiana')]]),
      new Map([['liga-colombiana', articulo('liga-colombiana')]]),
      new Map()
    )

    expect(salida.oportunidades.map(item => item.recommendation)).toEqual([
      'update', 'create', null
    ])
    expect(salida.oportunidades[2]?.evaluacion).toBe('pendiente')
  })

  it('no expone candidatas que incumplen el contrato', () => {
    const salida = proyectarOportunidadesEditorialesCodex(
      [crearFila('d'.repeat(64), { titleHint: 'Dato no validado' })],
      new Map(),
      new Map(),
      new Map(),
      new Map()
    )

    expect(salida.oportunidades).toEqual([])
    expect(salida.candidatasInvalidas).toBe(1)
  })
})
