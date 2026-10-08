import { describe, expect, it } from 'vitest'
import {
  construirPaginasHuerfanasSeo,
  construirRutaEntidadSeo,
  esRutaRaizCompeticionIndexable,
  claveEntidad,
  sugerirEntidadesPorCoincidencia,
  type EntidadCandidataSeo
} from '../../server/utils/grafoEntidadesSeo'
import { esquemaDecisionesRelacionesSeo } from '../../utils/editorial/grafoEntidades'

const equipo: EntidadCandidataSeo = {
  tipo: 'team',
  slug: 'atletico-nacional',
  nombre: 'Atlético Nacional',
  ruta: '/equipos/atletico-nacional',
  coincidencias: [['Atlético Nacional']]
}

describe('grafo interno de entidades SEO', () => {
  it('sugiere por coincidencia de frase completa sin depender de tildes', () => {
    const sugerencias = sugerirEntidadesPorCoincidencia(
      'Atlético Nacional se prepara para la final',
      'El equipo buscará el título.',
      '',
      [equipo]
    )

    expect(sugerencias).toMatchObject([{
      tipo: 'team',
      slug: 'atletico-nacional',
      confianza: 0.96
    }])
  })

  it('no confunde subcadenas ni sugiere un partido si solo aparece uno de los clubes', () => {
    const partido: EntidadCandidataSeo = {
      tipo: 'match',
      slug: 'nacional-vs-millonarios',
      nombre: 'Atlético Nacional vs. Millonarios',
      ruta: '/partidos/nacional-vs-millonarios',
      coincidencias: [['Atlético Nacional', 'Millonarios']]
    }

    expect(sugerirEntidadesPorCoincidencia(
      'Atlético Nacionalista ganó', '', '', [equipo]
    )).toEqual([])
    expect(sugerirEntidadesPorCoincidencia(
      'Atlético Nacional será local', '', '', [partido]
    )).toEqual([])
  })

  it('excluye relaciones ya revisadas y solo construye rutas internas tipadas', () => {
    expect(sugerirEntidadesPorCoincidencia(
      'Atlético Nacional gana', '', '', [equipo], new Set(['team:atletico-nacional'])
    )).toEqual([])
    expect(construirRutaEntidadSeo('competition', 'liga-betplay')).toBe('/competiciones/liga-betplay')
    expect(construirRutaEntidadSeo('team', '../../externo')).toBeNull()
  })

  it('solo convierte en entidad el hub de competición cuando esa ruta raíz es indexable', () => {
    expect(esRutaRaizCompeticionIndexable('/competiciones/liga-betplay', 'liga-betplay')).toBe(true)
    expect(esRutaRaizCompeticionIndexable('/competiciones/liga-betplay/2026-I', 'liga-betplay')).toBe(false)
  })

  it('reporta URL, tipo, enlaces entrantes, cluster y estado de cada página huérfana', () => {
    const articulo: EntidadCandidataSeo = {
      tipo: 'article',
      slug: 'previa-liga',
      nombre: 'Previa Liga',
      ruta: '/articulos/previa-liga',
      cluster: 'Liga BetPlay',
      coincidencias: []
    }
    const equipoConCluster: EntidadCandidataSeo = {
      ...equipo,
      cluster: 'Liga BetPlay'
    }
    const entradas = new Map([[claveEntidad('team', equipoConCluster.slug), new Set(['article:previa-liga'])]])

    expect(construirPaginasHuerfanasSeo([articulo, equipoConCluster], entradas)).toEqual({
      total: 1,
      paginas: [{
        tipo: 'article',
        slug: 'previa-liga',
        nombre: 'Previa Liga',
        ruta: '/articulos/previa-liga',
        enlacesEntrantes: 0,
        cluster: 'Liga BetPlay',
        estado: 'huerfana'
      }]
    })
  })

  it('valida decisiones y rechaza objetivos duplicados', () => {
    expect(esquemaDecisionesRelacionesSeo.safeParse({
      decisiones: [{
        tipo: 'player', slug: 'luis-diaz', relacion: 'about', estado: 'confirmed'
      }]
    }).success).toBe(true)
    expect(esquemaDecisionesRelacionesSeo.safeParse({
      decisiones: [
        { tipo: 'team', slug: 'atletico-nacional', relacion: 'related', estado: 'confirmed' },
        { tipo: 'team', slug: 'atletico-nacional', relacion: 'mentions', estado: 'rejected' }
      ]
    }).success).toBe(false)
  })
})
