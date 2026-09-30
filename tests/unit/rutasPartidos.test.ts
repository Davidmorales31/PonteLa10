import { describe, expect, it } from 'vitest'
import {
  construirEndpointDetallePartido,
  construirRutaCanonicaDetallePartido,
  construirRutaPartido,
  esSlugCanonicoPartidoSeguro
} from '../../utils/rutasPartidos'

describe('rutas canónicas de partidos', () => {
  it('usa la identidad interna cuando hay un slug seguro', () => {
    const partido = { id: '1234', slugInterno: 'america-vs-deportivo-cali-2026-09-30' }

    expect(construirRutaPartido(partido)).toBe('/partidos/america-vs-deportivo-cali-2026-09-30')
    expect(construirRutaCanonicaDetallePartido(partido)).toBe('/partidos/america-vs-deportivo-cali-2026-09-30')
    expect(construirEndpointDetallePartido(partido.slugInterno, true)).toBe('/api/partidos/america-vs-deportivo-cali-2026-09-30')
  })

  it('conserva el detalle heredado si no hay identidad interna pública', () => {
    expect(construirRutaPartido({ id: 'tsdb-futbol-77' })).toBe('/resultados/tsdb-futbol-77')
    expect(construirRutaPartido({ id: '77', slugInterno: '../otro-partido' })).toBe('/resultados/77')
    expect(construirEndpointDetallePartido('tsdb-futbol-77')).toBe('/api/resultados/tsdb-futbol-77')
  })

  it('rechaza segmentos vacíos, largos o con sintaxis fuera del slug público', () => {
    expect(esSlugCanonicoPartidoSeguro('')).toBe(false)
    expect(esSlugCanonicoPartidoSeguro('Equipo vs Otro 2026')).toBe(false)
    expect(esSlugCanonicoPartidoSeguro('a'.repeat(181))).toBe(false)
    expect(esSlugCanonicoPartidoSeguro('america-vs-deportivo-cali-2026-09-30')).toBe(true)
  })
})
