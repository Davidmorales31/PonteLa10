import { describe, expect, it } from 'vitest'
import {
  parsearTablasPosicionesDimayor,
  proyectarTablaDimayorAutorizada,
  proyectarTablasDimayorAutorizadas,
  type BaseTablaLigaAutorizada,
  type FilaTablaDimayor
} from '~/server/utils/tablaPosicionesDimayor'
import { normalizarClaveEquipoLiga } from '~/server/utils/partidosSeoPublicos'

function crearFila(posicion: number, equipo: string): FilaTablaDimayor {
  return { posicion, equipo, jugados: 1, ganados: 1, empatados: 0, perdidos: 0,
    golesFavor: 2, golesContra: 0, diferenciaGoles: 2, puntos: 3 }
}

function htmlTabla(titulo: string, filas: FilaTablaDimayor[]): string {
  const cuerpo = filas.map(fila => `<tr><td>${fila.posicion}</td><td><div><span class="team-name-small">${fila.equipo}</span></div></td><td>${fila.puntos}</td><td>${fila.jugados}</td><td>${fila.ganados}</td><td>${fila.empatados}</td><td>${fila.perdidos}</td><td>${fila.golesFavor}</td><td>${fila.golesContra}</td><td>${fila.diferenciaGoles > 0 ? `+${fila.diferenciaGoles}` : fila.diferenciaGoles}</td></tr>`).join('')
  return `<div class="dimayor-standings-card"><div class="standings-header"><h3>${titulo}</h3></div><table class="dimayor-table"><tbody>${cuerpo}</tbody></table></div>`
}

function baseAutorizada(teamName: string, teamKey: string, overrides: Partial<BaseTablaLigaAutorizada> = {}): BaseTablaLigaAutorizada {
  return { competition_slug: 'liga-betplay', season: '2026-II', phase: 'Todos contra todos',
    team_key: teamKey, team_name: teamName, is_public: true, publication_rights_confirmed: true, ...overrides }
}

describe('sincronización de posiciones oficiales DIMAYOR', () => {
  it('reconoce variantes oficiales con sufijo F.C.', () => {
    expect(normalizarClaveEquipoLiga('Llaneros F.C.')).toBe('llaneros')
  })

  it('lee datos y escapa nombres de la tabla oficial sin duplicar el modal oculto', () => {
    const tabla = htmlTabla('Liga BetPlay - FASE I &#8211; TODOS CONTRA TODOS', [
      crearFila(1, 'América de Cali'), crearFila(2, 'Millonarios F.C.')
    ])
    const resultados = parsearTablasPosicionesDimayor(tabla + tabla, 'liga-betplay')

    expect(resultados).toHaveLength(1)
    expect(resultados[0]).toMatchObject({
      competencia: 'liga-betplay', fase: 'Todos contra todos', filas: [
        { equipo: 'América de Cali', posicion: 1, puntos: 3 },
        { equipo: 'Millonarios F.C.', posicion: 2, puntos: 3 }
      ]
    })
  })

  it('rechaza posiciones duplicadas, stats incoherentes y tablas ambiguas', () => {
    const valida = htmlTabla('Liga BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'América de Cali'), crearFila(2, 'Millonarios')
    ])
    const duplicada = htmlTabla('Liga BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'América de Cali'), crearFila(1, 'Millonarios')
    ])
    const incoherente = htmlTabla('Liga BetPlay - FASE I - TODOS CONTRA TODOS', [
      { ...crearFila(1, 'América de Cali'), diferenciaGoles: 7 }, crearFila(2, 'Millonarios')
    ])

    expect(parsearTablasPosicionesDimayor(duplicada, 'liga-betplay')).toEqual([])
    expect(parsearTablasPosicionesDimayor(incoherente, 'liga-betplay')).toEqual([])
    expect(parsearTablasPosicionesDimayor(valida + htmlTabla('Liga BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'Deportivo Cali'), crearFila(2, 'Junior')
    ]), 'liga-betplay')).toEqual([])
  })

  it('mapea nombres oficiales documentados y actualiza solo la tabla íntegra ya autorizada', () => {
    const tabla = parsearTablasPosicionesDimayor(htmlTabla('Torneo BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'Internacional F.C. de Palmira'), crearFila(2, 'Atlético F.C.')
    ]), 'torneo-betplay')[0]!
    const bases = [
      baseAutorizada('Internacional FC de Palmira', 'internacional-fc-de-palmira', {
        competition_slug: 'torneo-betplay', phase: 'Fase todos contra todos'
      }),
      baseAutorizada('Atlético FC', 'atletico-fc', {
        competition_slug: 'torneo-betplay', phase: 'Fase todos contra todos'
      })
    ]
    const filas = proyectarTablaDimayorAutorizada(tabla, bases, '2026-10-06', '2026-10-06T12:00:00.000Z')

    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({
      team_key: 'internacional-fc-de-palmira', position: 1, points: 3,
      source_name: 'DIMAYOR', source_url: 'https://dimayor.com.co/torneo-betplay-dimayor/',
      is_public: true, publication_rights_confirmed: true
    })
  })

  it('no proyecta si falta una fila, el equipo no coincide, el año es anterior o se revocó autorización', () => {
    const tabla = parsearTablasPosicionesDimayor(htmlTabla('Liga BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'América de Cali'), crearFila(2, 'Equipo nuevo')
    ]), 'liga-betplay')[0]!
    const bases = [baseAutorizada('América de Cali', 'america'), baseAutorizada('Millonarios', 'millonarios')]

    expect(proyectarTablaDimayorAutorizada(tabla, bases, '2026-10-06')).toEqual([])
    expect(proyectarTablaDimayorAutorizada(tabla, bases.map(base => ({ ...base,
      is_public: false, publication_rights_confirmed: false })), '2026-10-06')).toEqual([])
    expect(proyectarTablaDimayorAutorizada(tabla, bases, '2027-01-01')).toEqual([])
  })

  it('elige el semestre activo y exige todas las fases autorizadas de ambas ligas', () => {
    const htmlA = htmlTabla('Liga BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'América de Cali'), crearFila(2, 'Millonarios')
    ])
    const htmlB = htmlTabla('Torneo BetPlay - FASE I - TODOS CONTRA TODOS', [
      crearFila(1, 'Internacional F.C. de Palmira'), crearFila(2, 'Atlético F.C.')
    ])
    const tablas = [
      ...parsearTablasPosicionesDimayor(htmlA, 'liga-betplay'),
      ...parsearTablasPosicionesDimayor(htmlB, 'torneo-betplay')
    ]
    const bases = [
      baseAutorizada('América de Cali', 'america'),
      baseAutorizada('Millonarios', 'millonarios'),
      baseAutorizada('América de Cali', 'america-i', { season: '2026-I' }),
      baseAutorizada('Internacional FC de Palmira', 'internacional', {
        competition_slug: 'torneo-betplay', phase: 'Fase todos contra todos'
      }),
      baseAutorizada('Atlético FC', 'atletico', {
        competition_slug: 'torneo-betplay', phase: 'Fase todos contra todos'
      })
    ]

    expect(proyectarTablasDimayorAutorizadas(tablas, bases, '2026-10-06')).toHaveLength(4)
    expect(proyectarTablasDimayorAutorizadas([
      ...tablas,
      ...parsearTablasPosicionesDimayor(htmlTabla('Cuadrangulares Grupo A', [
        crearFila(1, 'América de Cali'), crearFila(2, 'Millonarios')
      ]), 'liga-betplay')
    ], [...bases, baseAutorizada('América de Cali', 'america-a', { phase: 'Cuadrangulares · Grupo A' })],
    '2026-10-06')).toEqual([])
  })
})
