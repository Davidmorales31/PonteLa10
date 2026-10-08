import { describe, expect, it } from 'vitest'
import {
  detectarCandidatosPodaContenido,
  detectarImpresionesCeroProlongadas,
  esquemaDecisionPodaContenido,
  type ArticuloPodaContenido
} from '../../utils/editorial/podaContenido'

const hoy = new Date('2026-10-08T12:00:00.000Z')

function articulo(overrides: Partial<ArticuloPodaContenido> = {}): ArticuloPodaContenido {
  return {
    id: 'c0f69c53-49d0-4ef0-a946-89d6ac94417a',
    slug: 'noticia-de-ejemplo',
    titulo: 'Noticia de ejemplo para revisar',
    tituloSeo: 'Noticia de ejemplo para revisar',
    descripcionSeo: 'Una descripción suficientemente completa para motores de búsqueda.',
    publicadoEn: '2025-10-01T12:00:00.000Z',
    ultimaVersionPublicadaEn: '2025-10-01T12:00:00.000Z',
    publishedVersionId: '772b8c6c-79d2-4aa7-a8dc-b4ac29023711',
    ...overrides
  }
}

describe('HU-ED-29 · revisión conservadora de contenido', () => {
  it('prioriza artículos sin enlaces internos, pero no declara obsoleta una noticia solo por edad', () => {
    const sinEnlaces = articulo()
    const antigua = articulo({
      id: 'ec586477-0264-4886-b9d0-daa0bbf33ee9',
      slug: 'antigua-con-enlaces-y-seo',
      ultimaVersionPublicadaEn: '2024-01-01T12:00:00.000Z'
    })
    const candidatos = detectarCandidatosPodaContenido(
      [sinEnlaces, antigua],
      new Map([[antigua.id, 2]]),
      new Map(),
      new Map(),
      hoy
    )

    expect(candidatos.map(candidato => candidato.articleId)).toEqual([sinEnlaces.id])
    expect(candidatos[0].senales[0].tipo).toBe('sin_enlaces')
  })

  it('usa antigüedad junto con metadatos incompletos como señal, sin inferir que el artículo carece de valor histórico', () => {
    const candidato = articulo({
      tituloSeo: null,
      descripcionSeo: null,
      ultimaVersionPublicadaEn: '2024-01-01T12:00:00.000Z'
    })
    const [resultado] = detectarCandidatosPodaContenido(
      [candidato], new Map([[candidato.id, 1]]), new Map(), new Map(), hoy
    )

    expect(resultado.senales.map(senal => senal.tipo)).toEqual(['antiguedad', 'seo_incompleto'])
    expect(resultado.diasSinActualizacionPublicada).toBeGreaterThan(900)
  })

  it('identifica títulos casi idénticos y reporta la otra página para comparar manualmente', () => {
    const primero = articulo({ titulo: 'Los jugadores colombianos brillan en Europa' })
    const segundo = articulo({
      id: 'ea6677ab-7c4e-4c53-a6e9-713d0903518c',
      slug: 'jugadores-colombianos-brillan-europa',
      titulo: 'Jugadores colombianos brillan en Europa'
    })
    const candidatos = detectarCandidatosPodaContenido(
      [primero, segundo], new Map([[primero.id, 1], [segundo.id, 1]]), new Map(), new Map(), hoy
    )

    expect(candidatos).toHaveLength(2)
    const candidatoPrimero = candidatos.find(candidato => candidato.slug === primero.slug)
    expect(candidatoPrimero?.articuloSimilar?.slug).toBe('jugadores-colombianos-brillan-europa')
    expect(candidatoPrimero?.senales.map(senal => senal.tipo)).toContain('posible_duplicado')
  })

  it('solo usa Search Console con filas explícitas de cero y cobertura cercana a continua de al menos 90 días', () => {
    const informes = [
      { id: 'reporte-a', period_start: '2026-01-01', period_end: '2026-02-28' },
      { id: 'reporte-b', period_start: '2026-03-01', period_end: '2026-04-15' }
    ]
    const url = 'https://www.pont3la10.com/articulos/noticia-de-ejemplo'
    const slugs = new Map([[url, 'noticia-de-ejemplo']])
    const filas = [
      { page_url: url, report_id: 'reporte-a' },
      { page_url: url, report_id: 'reporte-b' }
    ]

    expect(detectarImpresionesCeroProlongadas(filas, informes, slugs).get('noticia-de-ejemplo'))
      .toMatchObject({ informes: 2 })
    expect(detectarImpresionesCeroProlongadas([], informes, slugs).size).toBe(0)
    expect(detectarImpresionesCeroProlongadas(
      filas,
      [informes[0], { ...informes[1], period_start: '2026-06-01' }],
      slugs
    ).size).toBe(0)
  })

  it('requiere justificación y rechaza destinos externos al guardar una propuesta de riesgo', () => {
    const base = { articleId: 'c0f69c53-49d0-4ef0-a946-89d6ac94417a' }
    expect(esquemaDecisionPodaContenido.safeParse({ ...base, decision: 'noindex' }).success).toBe(false)
    expect(esquemaDecisionPodaContenido.safeParse({
      ...base,
      decision: 'redirect',
      nota: 'Se validó que la URL nueva conserva la intención.',
      destinoInterno: 'https://example.com/noticia'
    }).success).toBe(false)
    expect(esquemaDecisionPodaContenido.safeParse({
      ...base,
      decision: 'redirect',
      nota: 'Se validó que la URL nueva conserva la intención.',
      destinoInterno: '/articulos/noticia-destino'
    }).success).toBe(true)
  })
})
