import { describe, expect, it } from 'vitest'
import {
  esNoticiaRelacionadaCompeticion,
  validarSnapshotTablaPublica,
  seleccionarFasesClasificacionCompletas,
  construirTemporadasPublicasCompeticion,
  construirJornadasIndexablesPublicas,
  normalizarIdentidadEquiposCompeticionPublica,
  type FilaTablaCompeticionPublica,
  type SlugCompeticionPublica
} from '../../server/utils/competicionesPublicas'
import type { PartidoSeoPublico } from '../../server/utils/partidosSeoPublicos'
import type { EquipoLigaPublico } from '../../server/utils/equiposLigaPublicos'

const fechaAhora = Date.parse('2026-10-06T17:00:00.000Z')

function crearSnapshotTablaHistorica(): Record<string, unknown> {
  return {
    competition_slug: 'liga-betplay',
    season: '2026-I',
    phase: 'Todos contra todos',
    team_count: 20,
    matches_per_team: 19,
    standings: Array.from({ length: 20 }, (_, indice) => ({
      team_name: `Equipo ${indice + 1}`,
      position: indice + 1,
      played: 19,
      won: 10,
      drawn: 5,
      lost: 4,
      goals_for: 30,
      goals_against: 18,
      goal_difference: 12,
      points: 35
    })),
    source_name: 'DIMAYOR + Goal API',
    source_urls: ['https://dimayor.com.co/liga-betplay-dimayor/'],
    checked_at: '2026-05-04T12:00:00.000Z',
    finalized_at: '2026-05-03T12:00:00.000Z',
    is_public: true,
    publication_rights_confirmed: true
  }
}

function crearPartidos(
  temporada: string,
  cantidad: number,
  inicio: string,
  competencia: SlugCompeticionPublica = 'liga-betplay'
): PartidoSeoPublico[] {
  return Array.from({ length: cantidad }, (_, indice) => {
    const local = indice % 8
    const visitante = (indice + 1) % 8
    return {
      slug: `${temporada.toLocaleLowerCase()}-partido-${indice + 1}`,
      competencia,
      temporada,
      jornada: `Fecha ${Math.floor(indice / 2) + 1}`,
      fechaIso: new Date(Date.parse(inicio) + indice * 60 * 60 * 1000).toISOString(),
      local: `Equipo ${local + 1}`,
      visitante: `Equipo ${visitante + 1}`,
      estado: 'scheduled',
      golesLocal: null,
      golesVisitante: null,
      estadio: null,
      ciudad: null,
      fuenteOficialUrl: null,
      escudoLocal: null,
      escudoVisitante: null,
      verificadoEn: '2026-10-06T12:00:00.000Z'
    }
  })
}

function crearFilaTabla(equipoSlug: string, fase: string): FilaTablaCompeticionPublica {
  return {
    competencia: 'liga-betplay', temporada: '2026-II', fase,
    equipoSlug, equipoNombre: `Equipo ${equipoSlug}`, equipoEscudo: null,
    posicion: 1, jugados: 0, ganados: 0, empatados: 0, perdidos: 0,
    golesFavor: 0, golesContra: 0, diferencia: 0, puntos: 0,
    verificadoEn: '2026-10-06T12:00:00.000Z'
  }
}

function crearJornadaCompleta(
  competencia: SlugCompeticionPublica = 'liga-betplay',
  temporada = '2026-II'
): PartidoSeoPublico[] {
  const equipos = competencia === 'liga-betplay' ? 20 : 16
  return Array.from({ length: equipos / 2 }, (_, indice) => ({
    ...crearPartidos(temporada, equipos / 2, '2026-10-01T18:00:00.000Z', competencia)[indice]!,
    jornada: 'Fecha 13',
    local: `Equipo ${indice + 1}`,
    visitante: `Equipo ${indice + 1 + equipos / 2}`,
    fuenteOficialUrl: 'https://dimayor.com.co/programaciones-competencias-dimayor-2026/'
  }))
}

function crearEquiposOficiales(competencia: SlugCompeticionPublica = 'liga-betplay'): string[] {
  const cantidad = competencia === 'liga-betplay' ? 20 : 16
  return Array.from({ length: cantidad }, (_, indice) => `Equipo ${indice + 1}`)
}

describe('temporadas permanentes de competición', () => {
  it('mantiene una URL raíz para la temporada actual y rutas explícitas para las históricas', () => {
    const partidos = [
      ...crearPartidos('2026-I', 8, '2026-04-01T18:00:00.000Z'),
      ...crearPartidos('2026-II', 8, '2026-11-01T18:00:00.000Z')
    ]
    const temporadas = construirTemporadasPublicasCompeticion(
      'liga-betplay' satisfies SlugCompeticionPublica,
      partidos,
      [],
      fechaAhora
    )

    expect(temporadas.map(temporada => [temporada.temporada, temporada.ruta, temporada.indexable])).toEqual([
      ['2026-II', '/competiciones/liga-betplay', true],
      ['2026-I', '/competiciones/liga-betplay/2026-I', true]
    ])
  })

  it('no declara indexable una temporada con datos insuficientes', () => {
    const temporadas = construirTemporadasPublicasCompeticion(
      'copa-colombia',
      crearPartidos('2026-II', 1, '2026-11-01T18:00:00.000Z', 'copa-colombia'),
      [],
      fechaAhora
    )
    expect(temporadas).toHaveLength(1)
    expect(temporadas[0]?.indexable).toBe(false)
    expect(temporadas[0]?.ruta).toBe('/competiciones/copa-colombia')
  })

  it('solo presenta clasificaciones con la cobertura completa de cada fase', () => {
    const faseRegular = Array.from({ length: 20 }, (_, indice) => crearFilaTabla(`equipo-${indice + 1}`, 'Todos contra todos'))
    const gruposCuadrangulares = [
      ...Array.from({ length: 4 }, (_, indice) => crearFilaTabla(`grupo-a-${indice + 1}`, 'Cuadrangulares Grupo A')),
      ...Array.from({ length: 4 }, (_, indice) => crearFilaTabla(`grupo-b-${indice + 1}`, 'Cuadrangulares Grupo B'))
    ]

    expect(seleccionarFasesClasificacionCompletas(faseRegular, 'liga-betplay')).toHaveLength(20)
    expect(seleccionarFasesClasificacionCompletas(faseRegular.slice(0, 8), 'liga-betplay')).toHaveLength(0)
    expect(seleccionarFasesClasificacionCompletas(gruposCuadrangulares, 'liga-betplay')).toHaveLength(8)
    expect(seleccionarFasesClasificacionCompletas(gruposCuadrangulares.slice(1), 'liga-betplay')).toHaveLength(0)
    expect(seleccionarFasesClasificacionCompletas(gruposCuadrangulares.slice(4), 'liga-betplay')).toHaveLength(0)
  })

  it('limita las noticias a menciones de la competición o al menos dos clubes participantes', () => {
    const equipos = ['Fortaleza CEIF', 'Millonarios', 'América de Cali', 'Atlético Nacional']
    const noticiaDeTorneo = {
      titulo: 'Boca Juniors llega al duelo con Unión tras un 3-2 interrumpido en Cartagena',
      resumen: 'Boca ganó 3-2. Unión llega tras vencer a Real Santander; jugarán el 7 de octubre.'
    }

    expect(esNoticiaRelacionadaCompeticion({
      titulo: 'Fortaleza y Millonarios llegan a la fecha 14',
      resumen: 'El encuentro de la Liga colombiana se juega el jueves.'
    }, 'Liga BetPlay', equipos)).toBe(true)

    expect(esNoticiaRelacionadaCompeticion({
      ...noticiaDeTorneo
    }, 'Liga BetPlay', [...equipos, 'Junior'])).toBe(false)

    expect(esNoticiaRelacionadaCompeticion(noticiaDeTorneo, 'Torneo BetPlay', [
      'Boca Juniors de Cali', 'Unión Magdalena', 'Real Santander'
    ])).toBe(true)

    expect(esNoticiaRelacionadaCompeticion({
      titulo: 'Liga Femenina 2026: balance de la temporada',
      resumen: 'Deportivo Cali ganó el torneo femenino.'
    }, 'Liga BetPlay', equipos)).toBe(false)

    expect(esNoticiaRelacionadaCompeticion({
      titulo: 'La Liga BetPlay abre la fecha 14',
      resumen: 'Consulta la agenda de la competición.'
    }, 'Liga BetPlay', equipos)).toBe(true)
  })
})

describe('snapshots históricos de posiciones', () => {
  it('acepta solo una tabla final completa, coherente y con fuentes seguras', () => {
    const snapshot = validarSnapshotTablaPublica(
      crearSnapshotTablaHistorica(), 'liga-betplay', '2026-I', [], fechaAhora
    )

    expect(snapshot?.filas).toHaveLength(20)
    expect(snapshot?.filas[0]).toMatchObject({
      competencia: 'liga-betplay', temporada: '2026-I', fase: 'Todos contra todos',
      posicion: 1, jugados: 19, puntos: 35, equipoSlug: null, equipoNombre: 'Equipo 1'
    })
    expect(snapshot?.metadata.finalizadaEn).toBe('2026-05-03T12:00:00.000Z')
  })

  it('rechaza snapshots parciales, no autorizados, inconsistentes o con verificación futura', () => {
    const base = crearSnapshotTablaHistorica()
    const filas = base.standings as Array<Record<string, unknown>>
    const casos = [
      { ...base, standings: filas.slice(0, 19) },
      { ...base, publication_rights_confirmed: false },
      { ...base, source_urls: ['http://dimayor.com.co/tabla'] },
      { ...base, checked_at: '2026-10-07T18:00:00.000Z' },
      { ...base, standings: filas.map((fila, indice) => indice === 0 ? { ...fila, points: 34 } : fila) },
      { ...base, standings: filas.map((fila, indice) => indice === 1 ? { ...fila, position: 1 } : fila) }
    ]

    for (const caso of casos) {
      expect(validarSnapshotTablaPublica(caso, 'liga-betplay', '2026-I', [], fechaAhora)).toBeNull()
    }
  })
})

describe('páginas indexables de jornada', () => {
  it('presenta un nombre anterior con nombre, escudo y enlace del padrón actual, sin alterar históricos', () => {
    const partido = {
      ...crearJornadaCompleta()[0]!,
      visitante: 'La Equidad',
      equipoVisitanteSlug: undefined,
      escudoVisitante: null
    }
    const equipoOficial: EquipoLigaPublico = {
      slug: 'internacional-de-bogota',
      nombre: 'Internacional de Bogotá',
      escudo: '/escudos/internacional-de-bogota.svg',
      clasificaciones: [{
        competencia: 'liga-betplay', temporada: '2026-II', fase: 'Todos contra todos',
        posicion: 13, jugados: 0, ganados: 0, empatados: 0, perdidos: 0,
        golesFavor: 0, golesContra: 0, diferencia: 0, puntos: 0,
        verificadoEn: '2026-10-06T12:00:00.000Z'
      }],
      actualizadoEn: '2026-10-06T12:00:00.000Z'
    }
    const [actual] = normalizarIdentidadEquiposCompeticionPublica(
      [partido], 'liga-betplay', [equipoOficial]
    )
    const [historico] = normalizarIdentidadEquiposCompeticionPublica(
      [{ ...partido, temporada: '2026-I' }], 'liga-betplay', [equipoOficial]
    )

    expect(actual).toMatchObject({
      visitante: 'Internacional de Bogotá',
      equipoVisitanteSlug: 'internacional-de-bogota',
      escudoVisitante: '/escudos/internacional-de-bogota.svg'
    })
    expect(historico).toMatchObject({
      visitante: 'La Equidad',
      equipoVisitanteSlug: undefined,
      escudoVisitante: null
    })
  })

  it('publica una URL canónica por temporada solo si están los partidos de todos los equipos', () => {
    const partidos = crearJornadaCompleta()
    const equiposOficiales = crearEquiposOficiales()
    const jornadas = construirJornadasIndexablesPublicas('liga-betplay', '2026-II', partidos, equiposOficiales, fechaAhora)

    expect(jornadas).toHaveLength(1)
    expect(jornadas[0]?.ruta).toBe('/jornadas/liga-betplay/2026-II/jornada-13')
    expect(jornadas[0]?.partidos).toHaveLength(10)
    expect(jornadas[0]?.equipos).toBe(20)
    expect(construirJornadasIndexablesPublicas('liga-betplay', '2026-II', partidos.slice(1), equiposOficiales, fechaAhora)).toEqual([])
    expect(construirJornadasIndexablesPublicas('liga-betplay', '2026-II', [...partidos, partidos[0]!], equiposOficiales, fechaAhora)).toEqual([])
    expect(construirJornadasIndexablesPublicas('liga-betplay', '2026-II', partidos, [], fechaAhora)).toEqual([])
  })

  it('excluye una jornada con un club fuera del padrón oficial aunque tenga 10 partidos', () => {
    const partidos = crearJornadaCompleta()
    const jornadaConNombreAjeno = [
      { ...partidos[0]!, local: 'La Equidad' },
      ...partidos.slice(1)
    ]

    expect(construirJornadasIndexablesPublicas(
      'liga-betplay', '2026-II', jornadaConNombreAjeno, crearEquiposOficiales(), fechaAhora
    )).toEqual([])
  })

  it('normaliza un nombre heredado solo en la temporada donde DIMAYOR confirma la identidad', () => {
    const partidos = crearJornadaCompleta().map((partido, indice) => indice === 0
      ? { ...partido, local: 'La Equidad' }
      : partido)
    const equiposOficiales = ['Internacional de Bogotá', ...crearEquiposOficiales().slice(1)]

    expect(construirJornadasIndexablesPublicas(
      'liga-betplay', '2026-II', partidos, equiposOficiales, fechaAhora
    )).toHaveLength(1)
    expect(construirJornadasIndexablesPublicas(
      'liga-betplay', '2026-I', partidos, equiposOficiales, fechaAhora
    )).toEqual([])
  })

  it('no publica una jornada con un encuentro adicional reclasificado por el proveedor', () => {
    const partidos = crearJornadaCompleta()
    const partidosConExtra = [...partidos, {
      ...partidos[0]!,
      slug: 'equipo-1-vs-equipo-11-reprogramado',
      fechaIso: '2026-10-13T18:00:00.000Z'
    }]

    expect(construirJornadasIndexablesPublicas(
      'liga-betplay', '2026-II', partidosConExtra, crearEquiposOficiales(), fechaAhora
    )).toEqual([])
  })

  it('rechaza fuentes verificadas con marca de tiempo futura', () => {
    const partidos = crearJornadaCompleta().map(partido => ({ ...partido, verificadoEn: '2026-10-07T12:00:00.000Z' }))

    expect(construirJornadasIndexablesPublicas(
      'liga-betplay', '2026-II', partidos, crearEquiposOficiales(), fechaAhora
    )).toEqual([])
  })

  it('admite un torneo de 16 equipos y excluye juegos sin fuente oficial', () => {
    const partidos = crearJornadaCompleta('torneo-betplay')
    const equiposOficiales = crearEquiposOficiales('torneo-betplay')
    expect(construirJornadasIndexablesPublicas('torneo-betplay', '2026-II', partidos, equiposOficiales, fechaAhora)[0]?.partidos).toHaveLength(8)
    expect(construirJornadasIndexablesPublicas('torneo-betplay', '2026-II', [
      ...partidos.slice(0, -1), { ...partidos.at(-1)!, fuenteOficialUrl: null }
    ], equiposOficiales, fechaAhora)).toEqual([])
  })

  it('no crea jornadas por fecha, fase de copa o parámetros de URL inválidos', () => {
    const partidos = crearJornadaCompleta('copa-colombia')
    expect(construirJornadasIndexablesPublicas('copa-colombia', '2026-II', partidos, [], fechaAhora)).toEqual([])
    expect(construirJornadasIndexablesPublicas('liga-betplay', '2026-II', partidos.map(partido => ({
      ...partido, jornada: 'Cuadrangulares Grupo A'
    })), crearEquiposOficiales(), fechaAhora)).toEqual([])
  })
})
