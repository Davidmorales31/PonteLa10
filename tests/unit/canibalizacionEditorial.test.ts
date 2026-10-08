import { describe, expect, it } from 'vitest'
import {
  detectarCanibalizacionEditorial,
  type ArticuloCanibalizacion
} from '../../utils/editorial/canibalizacion'
import type { FilaSearchConsole } from '../../utils/editorial/searchConsole'

const origen = 'https://www.pont3la10.com'

function metrica(consulta: string, ruta: string, impresiones = 100): FilaSearchConsole {
  return {
    consulta,
    paginaUrl: `${origen}${ruta}`,
    clics: Math.floor(impresiones / 10),
    impresiones,
    ctr: 10,
    posicion: 8
  }
}

function articulo(
  slug: string,
  titulo: string,
  opciones: Partial<ArticuloCanibalizacion> = {}
): ArticuloCanibalizacion {
  return {
    id: slug,
    url: `${origen}/articulos/${slug}`,
    titulo,
    tituloSeo: titulo,
    consultaObjetivo: null,
    intencion: null,
    entidades: [],
    ...opciones
  }
}

describe('HU-ED-28 · detección de canibalización editorial', () => {
  it('detecta consultas equivalentes de Search Console y conserva métricas de las dos URL', () => {
    const { candidatos, totalCandidatos, candidatosLimitados } = detectarCanibalizacionEditorial([
      metrica('América de Cali hoy', '/articulos/america-hoy', 240),
      metrica('América de Cali hoy', '/articulos/america-hoy-ultima-hora', 90),
      metrica('  america de cali HOY ', '/articulos/america-hoy', 10)
    ], [
      articulo('america-hoy', 'América de Cali: últimas noticias'),
      articulo('america-hoy-ultima-hora', 'Actualidad América de Cali')
    ])

    expect(candidatos).toHaveLength(1)
    expect(totalCandidatos).toBe(1)
    expect(candidatosLimitados).toBe(false)
    expect(candidatos[0]).toMatchObject({
      urlA: '/articulos/america-hoy',
      urlB: '/articulos/america-hoy-ultima-hora',
      cantidadConsultasCompartidas: 1,
      confianza: 'Baja'
    })
    expect(candidatos[0].consultasCompartidas[0]).toMatchObject({
      impresionesA: 250,
      impresionesB: 90
    })
    expect(candidatos[0].senales).toContain('La misma consulta aparece para ambas URL en Search Console')
  })

  it('prioriza una revisión de fusión solo cuando se acumulan señales fuertes', () => {
    const base = 'América de Cali confirma fecha próximo partido Liga BetPlay'
    const { candidatos } = detectarCanibalizacionEditorial([
      metrica('próximo partido América de Cali', '/articulos/fecha-america', 180),
      metrica('próximo partido América de Cali', '/articulos/partido-america', 120)
    ], [
      articulo('fecha-america', base, {
        consultaObjetivo: 'Próximo partido América de Cali',
        intencion: 'actualidad',
        entidades: [{ clave: 'team:america-de-cali', nombre: 'América de Cali' }]
      }),
      articulo('partido-america', 'América de Cali confirma la fecha del próximo partido en Liga BetPlay', {
        consultaObjetivo: 'proximo partido america de cali',
        intencion: 'actualidad',
        entidades: [{ clave: 'team:america-de-cali', nombre: 'América de Cali' }]
      })
    ])

    expect(candidatos).toHaveLength(1)
    expect(candidatos[0].confianza).toBe('Alta')
    expect(candidatos[0].accionSugerida).toBe('fusionar')
    expect(candidatos[0].accionesSugeridas).toEqual(['fusionar', 'redirect', 'canonical'])
    expect(candidatos[0].recomendacion).toContain('requiere elegir y aprobar')
  })

  it('no marca canibalización solo por compartir entidad e intención amplia', () => {
    const { candidatos } = detectarCanibalizacionEditorial([
      metrica('historia del club', '/articulos/goleador-america'),
      metrica('estadio y afición', '/articulos/america-estadio')
    ], [
      articulo('goleador-america', 'Quién es el goleador histórico de América de Cali', {
        intencion: 'perfil',
        entidades: [{ clave: 'team:america-de-cali', nombre: 'América de Cali' }]
      }),
      articulo('america-estadio', 'La historia del estadio de América de Cali', {
        intencion: 'perfil',
        entidades: [{ clave: 'team:america-de-cali', nombre: 'América de Cali' }]
      })
    ])

    expect(candidatos).toEqual([])
  })

  it('sugiere mantener ambas si la consulta coincide pero las intenciones confirmadas difieren', () => {
    const { candidatos } = detectarCanibalizacionEditorial([
      metrica('Colombia hoy', '/articulos/colombia-convocatoria'),
      metrica('colombia hoy', '/articulos/colombia-resultado')
    ], [
      articulo('colombia-convocatoria', 'Convocados de Colombia para el partido de hoy', { intencion: 'actualidad' }),
      articulo('colombia-resultado', 'Resultado del partido de Colombia de hoy', { intencion: 'resultado' })
    ])

    expect(candidatos[0]).toMatchObject({
      confianza: 'Baja',
      accionSugerida: 'mantener_ambas',
      accionesSugeridas: ['mantener_ambas', 'reorientar_intencion']
    })
    expect(candidatos[0].recomendacion).toContain('propósitos distintos')
  })

  it('omite URL ajenas, ignora metadatos de artículos ausentes del informe y limita resultados', () => {
    const metricas = [
      metrica('consulta compartida', '/articulos/a'),
      metrica('consulta compartida', '/articulos/b'),
      {
        ...metrica('consulta compartida', '/articulos/externo'),
        paginaUrl: 'https://otro.example/articulos/externo'
      }
    ]
    const articulos = [
      articulo('a', 'Consulta compartida y noticias del club'),
      articulo('b', 'Noticias del club y consulta compartida'),
      articulo('sin-impresiones', 'Mismo titular, misma entidad e intención')
    ]

    const limitado = detectarCanibalizacionEditorial(metricas, articulos, 0)
    const completo = detectarCanibalizacionEditorial(metricas, articulos, 5)
    expect(limitado).toMatchObject({ candidatos: [], totalCandidatos: 1, candidatosLimitados: true })
    expect(completo.candidatos).toHaveLength(1)
    expect(completo.candidatosLimitados).toBe(false)
    expect(completo.candidatos[0].urlA).not.toContain('externo')
  })
})
