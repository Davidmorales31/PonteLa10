import { describe, expect, it } from 'vitest'
import {
  esNoticiaRelacionadaCompeticion,
  seleccionarFasesClasificacionCompletas,
  construirTemporadasPublicasCompeticion,
  type FilaTablaCompeticionPublica,
  type SlugCompeticionPublica
} from '../../server/utils/competicionesPublicas'
import type { PartidoSeoPublico } from '../../server/utils/partidosSeoPublicos'

const fechaAhora = Date.parse('2026-10-06T17:00:00.000Z')

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
    expect(seleccionarFasesClasificacionCompletas(gruposCuadrangulares.slice(1), 'liga-betplay')).toHaveLength(4)
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
