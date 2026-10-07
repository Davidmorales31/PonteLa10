import {
  esquemaOportunidadCodexV1,
  esquemaOportunidadCodexV2
} from './esquemasCodexEditorial'
import type {
  ArticuloEditorialOportunidad,
  ArticuloPropuestoOportunidad,
  OportunidadEditorialCodex,
  RecomendacionEditorialCodex
} from '~/types/oportunidadesEditoriales'

export interface FilaAgendaEditorialCodex {
  category_id: string
  story_fingerprint: string
  candidate: unknown
  updated_at: string
}

export type ArticuloPublicadoOportunidad = ArticuloEditorialOportunidad

export interface ProyeccionOportunidadesEditorialesCodex {
  oportunidades: OportunidadEditorialCodex[]
  candidatasInvalidas: number
}

const rangoRecomendacion: Record<RecomendacionEditorialCodex, number> = {
  update: 0,
  merge: 1,
  expand: 2,
  create: 3,
  discard: 4
}

function claveCandidata(categoryId: string, fingerprint: string): string {
  return `${categoryId.toLowerCase()}:${fingerprint.toLowerCase()}`
}

function slugArticulo(url: string | null): string | null {
  const coincidencia = url?.match(/^\/articulos\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)
  return coincidencia?.[1] ?? null
}

export function proyectarOportunidadesEditorialesCodex(
  filas: FilaAgendaEditorialCodex[],
  nombresCategorias: Map<string, string>,
  articulosPorId: Map<string, ArticuloPublicadoOportunidad>,
  articulosPorSlug: Map<string, ArticuloPublicadoOportunidad>,
  propuestasPorHuella: Map<string, ArticuloPropuestoOportunidad>
): ProyeccionOportunidadesEditorialesCodex {
  let candidatasInvalidas = 0
  const oportunidades: OportunidadEditorialCodex[] = []

  for (const fila of filas) {
    const validacionV2 = esquemaOportunidadCodexV2.safeParse(fila.candidate)
    if (validacionV2.success) {
      const candidata = validacionV2.data
      const assessment = candidata.assessment
      const targetSlug = slugArticulo(assessment.targetUrl)
      const targetArticle = targetSlug
        ? articulosPorSlug.get(targetSlug) ?? null
        : null

      oportunidades.push({
        id: claveCandidata(fila.category_id, fila.story_fingerprint),
        categoryId: fila.category_id,
        categoryName: nombresCategorias.get(fila.category_id) ?? 'Categoría no disponible',
        fingerprint: fila.story_fingerprint,
        title: candidata.titleHint,
        term: candidata.term,
        evaluacion: 'completa',
        recommendation: assessment.recommendation,
        priorityScore: candidata.scores.priorityScore,
        updateability: candidata.scores.updateability,
        cannibalizationRisk: assessment.cannibalizationRisk,
        targetUrl: assessment.targetUrl,
        targetArticle,
        entityMatch: assessment.entityMatch,
        similarArticles: assessment.similarArticleIds
          .map(id => articulosPorId.get(id.toLowerCase()))
          .filter((articulo): articulo is ArticuloPublicadoOportunidad => Boolean(articulo))
          .map(({ id, slug, title }) => ({ id, slug, title })),
        noveltyRationale: assessment.noveltyRationale,
        differentiator: assessment.differentiator,
        proposalArticle: propuestasPorHuella.get(
          claveCandidata(fila.category_id, fila.story_fingerprint)
        ) ?? null,
        updatedAt: fila.updated_at
      })
      continue
    }

    const validacionV1 = esquemaOportunidadCodexV1.safeParse(fila.candidate)
    if (!validacionV1.success) {
      candidatasInvalidas += 1
      continue
    }

    const candidata = validacionV1.data
    oportunidades.push({
      id: claveCandidata(fila.category_id, fila.story_fingerprint),
      categoryId: fila.category_id,
      categoryName: nombresCategorias.get(fila.category_id) ?? 'Categoría no disponible',
      fingerprint: fila.story_fingerprint,
      title: candidata.titleHint,
      term: candidata.term,
      evaluacion: 'pendiente',
      recommendation: null,
      priorityScore: null,
      updateability: null,
      cannibalizationRisk: null,
      targetUrl: null,
      targetArticle: null,
      entityMatch: null,
      similarArticles: [],
      noveltyRationale: null,
      differentiator: null,
      proposalArticle: propuestasPorHuella.get(
        claveCandidata(fila.category_id, fila.story_fingerprint)
      ) ?? null,
      updatedAt: fila.updated_at
    })
  }

  oportunidades.sort((a, b) => {
    if (a.recommendation === null || b.recommendation === null) {
      if (a.recommendation === null && b.recommendation !== null) return 1
      if (a.recommendation !== null && b.recommendation === null) return -1
    }
    const rangoA = a.recommendation ? rangoRecomendacion[a.recommendation] : 5
    const rangoB = b.recommendation ? rangoRecomendacion[b.recommendation] : 5
    if (rangoA !== rangoB) return rangoA - rangoB
    return (b.priorityScore ?? -1) - (a.priorityScore ?? -1)
  })

  return { oportunidades, candidatasInvalidas }
}
