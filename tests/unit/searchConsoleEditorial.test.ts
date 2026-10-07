import { describe, expect, it } from 'vitest'
import {
  accionesOportunidadSearchConsole,
  clasificarOportunidadesSearchConsole,
  calcularTendenciaSearchConsole,
  esquemaAccionSearchConsole,
  esquemaImportacionSearchConsole,
  parsearCsvSearchConsole
} from '../../utils/editorial/searchConsole'

const urlSitio = 'https://www.pont3la10.com'

describe('HU-ED-21 · Search Console editorial', () => {
  it('lee exportes en inglés con coma y canonicaliza las URLs al dominio propio', () => {
    const csv = 'Top queries,Top pages,Clicks,Impressions,CTR,Position\n"selección, Colombia",https://pont3la10.com/futbol-colombiano?utm_source=gsc,12,500,2.4%,4.6'
    expect(parsearCsvSearchConsole(csv, urlSitio)).toEqual([{
      consulta: 'selección, Colombia',
      paginaUrl: 'https://www.pont3la10.com/futbol-colombiano',
      clics: 12,
      impresiones: 500,
      ctr: 2.4,
      posicion: 4.6
    }])
  })

  it('lee encabezados en español y decimales con coma en CSV separado por punto y coma', () => {
    const csv = '\uFEFFConsulta;Página;Clics;Impresiones;CTR;Posición\r\nLiga BetPlay;/liga-colombiana;3;120;2,5%;8,75'
    const [fila] = parsearCsvSearchConsole(csv, urlSitio)
    expect(fila).toMatchObject({
      consulta: 'Liga BetPlay',
      paginaUrl: 'https://www.pont3la10.com/liga-colombiana',
      clics: 3,
      impresiones: 120,
      ctr: 2.5,
      posicion: 8.75
    })
  })

  it('interpreta miles según el delimitador y aplica el límite de filas antes de procesarlas', () => {
    const csv = 'Query,Page,Clicks,Impressions,Position\nconsulta,/liga-colombiana,"1,234","12,345",2.5'
    expect(parsearCsvSearchConsole(csv, urlSitio)[0]).toMatchObject({
      clics: 1234,
      impresiones: 12345,
      posicion: 2.5
    })
    const csvDemasiadoGrande = [
      'Query,Page,Clicks,Impressions,Position',
      ...Array.from({ length: 5001 }, (_, indice) => 'consulta ' + indice + ',/liga-colombiana,1,2,3')
    ].join('\n')
    expect(() => parsearCsvSearchConsole(csvDemasiadoGrande, urlSitio))
      .toThrow('supera el máximo de 5000 filas')
  })

  it('calcula CTR si el exporte no lo incluye y conserva consultas con comillas escapadas', () => {
    const csv = 'Query,Page,Clicks,Impressions,Position\n"club ""X"" hoy",/articulos/club-x,1,4,2'
    const [fila] = parsearCsvSearchConsole(csv, urlSitio)
    expect(fila).toMatchObject({ consulta: 'club "X" hoy', ctr: 25 })
  })

  it('rechaza páginas externas, filas duplicadas y rangos de importación inválidos', () => {
    expect(() => parsearCsvSearchConsole(
      'Query,Page,Clicks,Impressions,Position\nquery,https://otro.example,1,4,2',
      urlSitio
    )).toThrow('no pertenece a Pont3la10')
    expect(() => parsearCsvSearchConsole(
      'Query,Page,Clicks,Impressions,Position\nquery,/articulos/a,1,4,2\nQUERY,/articulos/a,1,4,2',
      urlSitio
    )).toThrow('más de una vez')
    expect(esquemaImportacionSearchConsole.safeParse({
      fechaDesde: '2026-02-01', fechaHasta: '2026-01-01', csv: 'x'
    }).success).toBe(false)
  })

  it('solo acepta acciones editoriales definidas y notas acotadas', () => {
    expect(esquemaAccionSearchConsole.safeParse({
      consulta: 'liga colombiana',
      paginaUrl: `${urlSitio}/liga-colombiana`,
      accion: 'mejorar_titulo',
      nota: 'Alinear título con la pregunta observada.'
    }).success).toBe(true)
    expect(esquemaAccionSearchConsole.safeParse({
      consulta: 'liga colombiana',
      paginaUrl: `${urlSitio}/liga-colombiana`,
      accion: 'consolidar'
    }).success).toBe(false)
    expect(esquemaAccionSearchConsole.safeParse({
      consulta: 'liga colombiana',
      paginaUrl: `${urlSitio}/liga-colombiana`,
      accion: 'consolidar',
      nota: `${urlSitio}/articulos/liga-colombiana`
    }).success).toBe(true)
    expect(esquemaAccionSearchConsole.safeParse({
      consulta: 'liga colombiana',
      paginaUrl: `${urlSitio}/liga-colombiana`,
      accion: 'consolidar',
      nota: 'https://externo.example/liga-colombiana'
    }).success).toBe(false)
    expect(esquemaAccionSearchConsole.safeParse({
      consulta: 'liga colombiana',
      paginaUrl: `${urlSitio}/liga-colombiana`,
      accion: 'consolidar',
      nota: '/\\externo.example'
    }).success).toBe(false)
    expect(esquemaAccionSearchConsole.safeParse({
      consulta: 'liga colombiana',
      paginaUrl: `${urlSitio}/liga-colombiana`,
      accion: 'publicar'
    }).success).toBe(false)
  })

  it('compara períodos equivalentes sin inventar porcentaje cuando la base era cero', () => {
    expect(calcularTendenciaSearchConsole(
      { clics: 15, impresiones: 300, posicion: 4.2 },
      { clics: 10, impresiones: 200, posicion: 5.1 }
    )).toEqual({
      cambioClics: 5,
      cambioClicsPorcentaje: 50,
      cambioImpresiones: 100,
      cambioImpresionesPorcentaje: 50,
      cambioPosicion: -0.9
    })
    expect(calcularTendenciaSearchConsole(
      { clics: 2, impresiones: 30, posicion: 3 },
      { clics: 0, impresiones: 0, posicion: 4 }
    )?.cambioClicsPorcentaje).toBeNull()
    expect(calcularTendenciaSearchConsole({ clics: 1, impresiones: 1, posicion: 1 }, null)).toBeNull()
  })

  it('prioriza señales medibles, etiqueta cluster y entidad desde la URL y no crea consultas', () => {
    const filas = [
      { consulta: 'liga betplay', paginaUrl: `${urlSitio}/liga-colombiana`, impresiones: 80, clics: 0, ctr: 0, posicion: 8, tendencia: null },
      { consulta: 'equipo local', paginaUrl: `${urlSitio}/equipos/atletico-nacional`, impresiones: 30, clics: 2, ctr: 6.67, posicion: 5, tendencia: null },
      { consulta: 'equipo local', paginaUrl: `${urlSitio}/articulos/guia-atletico-nacional`, impresiones: 20, clics: 1, ctr: 5, posicion: 28, tendencia: null },
      { consulta: 'resultado europa', paginaUrl: `${urlSitio}/partidos-hoy`, impresiones: 10, clics: 1, ctr: 10, posicion: 25, tendencia: null }
    ]

    const [principal, equipo] = clasificarOportunidadesSearchConsole(filas, true)
    expect(principal).toMatchObject({
      cluster: 'Liga colombiana',
      entidad: 'Liga colombiana',
      prioridad: 'Alta',
      paginasConsulta: 1
    })
    expect(principal.recomendacion).toContain('título')
    expect(equipo).toMatchObject({
      consulta: 'equipo local',
      paginasConsulta: 2,
      prioridad: 'Alta'
    })
    expect(equipo.recomendacion).toContain('no crear otra URL')
    expect(equipo.cluster).toBe('Equipos')
    expect(equipo.entidad).toBe('Atletico Nacional')
    expect(accionesOportunidadSearchConsole).toEqual(['optimizar', 'actualizar', 'consolidar', 'ignorar'])
  })

  it('marca una posible consulta emergente con cautela y señala pérdida solo cuando empeora posición', () => {
    const filas = clasificarOportunidadesSearchConsole([
      {
        consulta: 'nueva búsqueda', paginaUrl: `${urlSitio}/articulos/nueva-busqueda`,
        impresiones: 15, clics: 1, ctr: 6.67, posicion: 12,
        tendencia: { cambioClics: 1, cambioClicsPorcentaje: null, cambioImpresiones: 15, cambioImpresionesPorcentaje: null, cambioPosicion: 1.2 }
      },
      {
        consulta: 'sin comparación', paginaUrl: `${urlSitio}/colombianos-en-europa`,
        impresiones: 8, clics: 1, ctr: 12.5, posicion: 25, tendencia: null
      }
    ], true)

    expect(filas.find(fila => fila.consulta === 'nueva búsqueda')?.motivos)
      .toContain('La posición media empeoró frente al período anterior')
    expect(filas.find(fila => fila.consulta === 'sin comparación')).toMatchObject({
      cluster: 'Colombianos en Europa',
      posibleEmergente: true
    })
    expect(filas.find(fila => fila.consulta === 'sin comparación')?.recomendacion)
      .toContain('Validar la nueva consulta')

    const sinInformeAnterior = clasificarOportunidadesSearchConsole([
      { consulta: 'búsqueda', paginaUrl: `${urlSitio}/`, impresiones: 1, clics: 0, ctr: 0, posicion: 50, tendencia: null }
    ], false)
    expect(sinInformeAnterior[0]?.posibleEmergente).toBe(false)
  })
})
