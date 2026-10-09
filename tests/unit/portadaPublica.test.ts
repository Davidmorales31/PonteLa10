import { describe, expect, it } from 'vitest'
import type { ResumenArticuloPublico } from '../../types/contenidoEditorial'
import type { PartidoResultado } from '../../types/resultados'
import {
  filtrarNoticiasEuropa,
  filtrarNoticiasLiga,
  filtrarNoticiasSeleccion,
  obtenerProximoPartidoLiga,
  obtenerResultadosLigaRecientes,
  separarJornadaPortada,
  type PartidoLigaPortada
} from '../../utils/portadaPublica'

function crearPartido(id: string, fechaIso: string, estado: PartidoResultado['estado']): PartidoResultado {
  return {
    id,
    deporte: 'futbol',
    competencia: 'Liga de prueba',
    fechaIso,
    estado,
    equipoLocal: { id: `local-${id}`, nombre: 'Local', nombreCorto: 'LOC' },
    equipoVisitante: { id: `visitante-${id}`, nombre: 'Visitante', nombreCorto: 'VIS' },
    marcadorLocal: estado === 'finalizado' ? 2 : undefined,
    marcadorVisitante: estado === 'finalizado' ? 1 : undefined
  }
}

function crearArticulo(slug: string, titulo: string, categoria = 'Fútbol mundial'): ResumenArticuloPublico {
  return {
    id: slug,
    slug,
    titulo,
    resumen: '',
    tipo: 'noticia',
    publicadoEn: '2026-10-08T12:00:00.000Z',
    autorNombre: 'Equipo Pont3la10',
    categoria,
    imagen: ''
  }
}

function crearPartidoLiga(
  slug: string,
  fechaIso: string,
  estado: string,
  golesLocal: number | null = null,
  golesVisitante: number | null = null
): PartidoLigaPortada {
  return {
    slug,
    competencia: 'liga-betplay',
    fechaIso,
    local: 'América de Cali',
    visitante: 'Deportivo Cali',
    estado,
    golesLocal,
    golesVisitante,
    verificadoEn: '2026-10-08T12:00:00.000Z'
  }
}

describe('portada pública', () => {
  it('separa los partidos de hoy por estado y oculta programados cuya hora ya pasó', () => {
    const jornada = separarJornadaPortada([
      crearPartido('en-vivo', '2026-10-08T18:00:00.000Z', 'en-vivo'),
      crearPartido('proximo', '2026-10-08T21:00:00.000Z', 'programado'),
      crearPartido('pendiente-vencido', '2026-10-08T19:00:00.000Z', 'programado'),
      crearPartido('finalizado', '2026-10-08T16:00:00.000Z', 'finalizado'),
      crearPartido('mañana', '2026-10-09T05:30:00.000Z', 'programado')
    ], '2026-10-08T20:00:00.000Z')

    expect(jornada.fecha).toBe('2026-10-08')
    expect(jornada.partidos.map(partido => partido.id)).toEqual(['finalizado', 'en-vivo', 'proximo'])
    expect(jornada.enVivo.map(partido => partido.id)).toEqual(['en-vivo'])
    expect(jornada.proximos.map(partido => partido.id)).toEqual(['proximo'])
    expect(jornada.finalizados.map(partido => partido.id)).toEqual(['finalizado'])
  })

  it('no devuelve una jornada inventada si el instante recibido no es válido', () => {
    expect(separarJornadaPortada([crearPartido('hoy', '2026-10-08T18:00:00.000Z', 'en-vivo')], 'no-es-fecha'))
      .toEqual({ fecha: '', partidos: [], enVivo: [], proximos: [], finalizados: [] })
  })

  it('ordena resultados recientes y exige marcador final confirmado', () => {
    const partidos = [
      crearPartidoLiga('antiguo', '2026-10-01T12:00:00.000Z', 'finished', 1, 0),
      crearPartidoLiga('reciente', '2026-10-07T12:00:00.000Z', 'FT', 3, 2),
      crearPartidoLiga('sin-marcador', '2026-10-08T12:00:00.000Z', 'finished'),
      crearPartidoLiga('futuro', '2026-10-09T12:00:00.000Z', 'finished', 2, 0)
    ]

    expect(obtenerResultadosLigaRecientes(partidos, '2026-10-08T20:00:00.000Z').map(partido => partido.slug))
      .toEqual(['reciente', 'antiguo'])
  })

  it('prioriza un encuentro en vivo y no devuelve calendarios vencidos', () => {
    const partidos = [
      crearPartidoLiga('vencido', '2026-10-08T17:00:00.000Z', 'scheduled'),
      crearPartidoLiga('futuro', '2026-10-09T17:00:00.000Z', 'scheduled'),
      crearPartidoLiga('vivo', '2026-10-08T16:00:00.000Z', 'live')
    ]

    expect(obtenerProximoPartidoLiga(partidos, '2026-10-08T20:00:00.000Z')?.slug).toBe('vivo')
    expect(obtenerProximoPartidoLiga([partidos[0]!], '2026-10-08T20:00:00.000Z')).toBeNull()
  })

  it('no mezcla etiquetas de temas con noticias ajenas a la Selección Colombia', () => {
    const articulos = [
      crearArticulo('colombia', 'Colombia y Perú cierran la fecha FIFA en Miami'),
      crearArticulo('baloncesto', 'Selección Colombia de baloncesto se prepara para el torneo', 'Baloncesto'),
      crearArticulo('moto', 'MotoGP llega a Mandalika y abre la temporada'),
      crearArticulo('tech', 'La IA amplía el análisis de scouting', 'Tecnología deportiva')
    ]

    expect(filtrarNoticiasSeleccion(articulos).map(articulo => articulo.slug)).toEqual(['colombia'])
  })

  it('limita las noticias de Liga a temas del torneo o a sus equipos conocidos', () => {
    const articulos = [
      crearArticulo('liga', 'Liga BetPlay: se juega la fecha 14', 'Fútbol colombiano'),
      crearArticulo('equipo', 'Millonarios llega con novedades', 'Fútbol colombiano'),
      crearArticulo('ajeno', 'Boca Juniors recibe a Unión', 'Fútbol colombiano')
    ]

    expect(filtrarNoticiasLiga(articulos, ['Millonarios']).map(articulo => articulo.slug)).toEqual(['liga', 'equipo'])
  })

  it('exige categoría futbolística y un perfil colombiano conocido para el bloque europeo', () => {
    const articulos = [
      crearArticulo('lucho', 'Luis Díaz volvió a entrenar con el Bayern'),
      crearArticulo('moto', 'Yáser Asprilla y MotoGP visitan Mandalika', 'Especiales'),
      crearArticulo('otro', 'Un club anuncia un nuevo entrenador')
    ]

    expect(filtrarNoticiasEuropa(articulos, ['Luis Díaz', 'Yáser Asprilla']).map(articulo => articulo.slug)).toEqual(['lucho'])
  })
})
