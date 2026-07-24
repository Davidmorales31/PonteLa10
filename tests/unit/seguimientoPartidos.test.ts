import { describe, expect, it } from 'vitest'
import type { PartidoResultado } from '../../types/resultados'
import {
  alternarIdPartido,
  cambioMarcador,
  crearContenidoNotificacionMarcador,
  esIncrementoMarcador
} from '../../utils/seguimientoPartidos'

const partidoBase: PartidoResultado = {
  id: 'partido-10',
  deporte: 'futbol',
  competencia: 'Liga de prueba',
  fechaIso: '2026-07-24T20:00:00-05:00',
  estado: 'en-vivo',
  minuto: 48,
  equipoLocal: { id: 'local', nombre: 'Pont3la10 FC', nombreCorto: 'P10' },
  equipoVisitante: { id: 'visitante', nombre: 'Visitante', nombreCorto: 'VIS' },
  marcadorLocal: 1,
  marcadorVisitante: 1
}

describe('seguimiento de partidos', () => {
  it('agrega y elimina un partido sin duplicar identificadores', () => {
    expect(alternarIdPartido([], partidoBase.id)).toEqual([partidoBase.id])
    expect(alternarIdPartido([partidoBase.id, partidoBase.id], partidoBase.id)).toEqual([])
  })

  it('detecta un cambio en cualquiera de los marcadores', () => {
    expect(cambioMarcador(partidoBase, { ...partidoBase, marcadorLocal: 2 })).toBe(true)
    expect(cambioMarcador(partidoBase, { ...partidoBase })).toBe(false)
  })

  it('anuncia como gol un incremento en un partido de futbol', () => {
    const partidoActual = { ...partidoBase, minuto: 49, marcadorLocal: 2 }
    const contenido = crearContenidoNotificacionMarcador(partidoBase, partidoActual)

    expect(esIncrementoMarcador(partidoBase, partidoActual)).toBe(true)
    expect(contenido.titulo).toContain('¡Gol!')
    expect(contenido.cuerpo).toContain('49')
  })

  it('no anuncia como gol una correccion descendente del proveedor', () => {
    const partidoActual = { ...partidoBase, marcadorLocal: 0 }
    const contenido = crearContenidoNotificacionMarcador(partidoBase, partidoActual)

    expect(esIncrementoMarcador(partidoBase, partidoActual)).toBe(false)
    expect(contenido.titulo).toContain('Marcador actualizado')
  })

  it('usa una alerta generica para cambios de otros deportes', () => {
    const partidoActual: PartidoResultado = {
      ...partidoBase,
      deporte: 'baloncesto',
      marcadorLocal: 3
    }

    expect(crearContenidoNotificacionMarcador(partidoBase, partidoActual).titulo)
      .toContain('Marcador actualizado')
  })
})
