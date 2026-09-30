import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FilaMembresiaColombianoEuropa } from '../../types/colombianosEuropa'
import type { PartidoResultado } from '../../types/resultados'
import {
  cruzarJugadoresConPartidos,
  filtrarMembresiasEuropeasActivas,
  formatearHoraColombia,
  formatearResultadoClubRival
} from '../../utils/colombianosEuropa'

function crearMembresia(
  slug: string,
  nombre: string,
  equipoId: string,
  codigoPaisEquipo: string,
  ajustes: Partial<FilaMembresiaColombianoEuropa> = {}
): FilaMembresiaColombianoEuropa {
  return {
    jugador: {
      slug,
      nombre,
      codigoPais: 'CO',
      deporte: 'futbol',
      publico: true,
      nacionalidadVerificadaEn: '2026-09-29T12:00:00.000Z'
    },
    membresia: { equipoId, desde: '2025-07-01', hasta: null, publico: true },
    equipo: { id: equipoId, slug: equipoId, nombre: `Club ${equipoId}`, codigoPais: codigoPaisEquipo, deporte: 'futbol', publico: true },
    ...ajustes
  }
}

const partidoLiverpool: PartidoResultado = {
  id: 'fixture-liverpool', deporte: 'futbol', competencia: 'Premier League',
  fechaIso: '2026-09-30T18:00:00Z', estado: 'programado',
  equipoLocal: { id: '44', idInterno: 'team-liverpool', nombre: 'Liverpool', nombreCorto: 'LIV' },
  equipoVisitante: { id: '77', idInterno: 'team-rival', nombre: 'Rival FC', nombreCorto: 'RIV' }
}

describe('hub Colombianos en Europa', () => {
  it('guarda fuente de nacionalidad sin conceder su lectura a visitantes anónimos', () => {
    const migracion = readFileSync(new URL(
      '../../supabase/migrations/20260930103132_hu_tr_19_verificacion_nacionalidad.sql',
      import.meta.url
    ), 'utf8')

    const patronFuente = migracion.match(/nationality_source_url ~ '([^']+)'/)?.[1]
    expect(patronFuente).toBeTruthy()
    const validarFuente = new RegExp(patronFuente!)
    expect(validarFuente.test('https://federacion.example/jugador')).toBe(true)
    expect(validarFuente.test('https://:')).toBe(false)
    expect(validarFuente.test('https://usuario@federacion.example/jugador')).toBe(false)
    expect(validarFuente.test('https://federacion.example/jugador?token=privado')).toBe(false)
    expect(validarFuente.test('https://federacion.example/jugador#fragmento')).toBe(false)
    expect(migracion).toContain('grant select (nationality_verified_at)')
    expect(migracion).not.toMatch(/grant select\s*\([^)]*nationality_source_url/s)
  })

  it('pagina memberships con cursor estable y falla cerrado sobre el tope operativo', () => {
    const repositorio = readFileSync(new URL(
      '../../server/utils/repositorioColombianosEuropa.ts',
      import.meta.url
    ), 'utf8')

    expect(repositorio).toContain(".order('id', { ascending: true })")
    expect(repositorio).toContain(".gt('id', ultimoIdMembresia)")
    expect(repositorio).toContain('const maximoMembresiasPublicas = 5_000')
    expect(repositorio).toContain('return { disponible: false, actualizadoEn, jugadores: [] }')
  })

  it('incluye solo jugadores colombianos públicos con membresía vigente en clubes europeos', () => {
    const filas = [
      crearMembresia('luis-diaz', 'Luis Díaz', 'team-liverpool', 'GB'),
      crearMembresia('jugador-inactivo', 'Jugador Inactivo', 'team-a', 'ES', {
        membresia: { equipoId: 'team-a', desde: '2024-01-01', hasta: '2025-12-31', publico: true }
      }),
      crearMembresia('jugador-sin-identidad', 'Jugador Privado', 'team-b', 'DE', {
        jugador: {
          slug: 'jugador-sin-identidad', nombre: 'Jugador Privado', codigoPais: 'CO', deporte: 'futbol', publico: false,
          nacionalidadVerificadaEn: '2026-09-29T12:00:00.000Z'
        }
      }),
      crearMembresia('jugador-otro-pais', 'Otro País', 'team-c', 'IT', {
        jugador: {
          slug: 'jugador-otro-pais', nombre: 'Otro País', codigoPais: 'AR', deporte: 'futbol', publico: true,
          nacionalidadVerificadaEn: '2026-09-29T12:00:00.000Z'
        }
      }),
      crearMembresia('jugador-fuera-europa', 'Fuera de Europa', 'team-d', 'US')
    ]

    expect(filtrarMembresiasEuropeasActivas(filas, '2026-09-30')).toEqual([{
      slug: 'luis-diaz', nombre: 'Luis Díaz', equipoIdInterno: 'team-liverpool',
      club: 'Club team-liverpool'
    }])
  })

  it('omite un jugador si hay dos clubes vigentes y no puede determinar cuál es el actual', () => {
    const jugador = crearMembresia('james', 'James Rodríguez', 'team-a', 'ES')
    const otraMembresia = crearMembresia('james', 'James Rodríguez', 'team-b', 'IT')

    expect(filtrarMembresiasEuropeasActivas([jugador, otraMembresia], '2026-09-30')).toEqual([])
  })

  it('exige fecha de verificación de nacionalidad', () => {
    const jugadorSinVerificar = crearMembresia('sin-verificar', 'Sin Verificar', 'team-a', 'ES', {
      jugador: {
        slug: 'sin-verificar', nombre: 'Sin Verificar', codigoPais: 'CO', deporte: 'futbol', publico: true,
        nacionalidadVerificadaEn: null
      }
    })

    expect(filtrarMembresiasEuropeasActivas([jugadorSinVerificar], '2026-09-30')).toEqual([])
  })

  it('omite membresías cuya vigencia no se puede demostrar por falta de fecha de inicio', () => {
    const sinFechas = crearMembresia('sin-fechas', 'Sin Fechas', 'team-a', 'ES', {
      membresia: { equipoId: 'team-a', desde: null, hasta: null, publico: true }
    })
    const sinInicio = crearMembresia('sin-inicio', 'Sin Inicio', 'team-b', 'IT', {
      membresia: { equipoId: 'team-b', desde: null, hasta: '2026-12-31', publico: true }
    })

    expect(filtrarMembresiasEuropeasActivas([sinFechas, sinInicio], '2026-09-30')).toEqual([])
  })

  it('cruza por UUID interno de club, no por nombre ni ID externo del proveedor', () => {
    const jugador = filtrarMembresiasEuropeasActivas([
      crearMembresia('luis-diaz', 'Luis Díaz', 'team-liverpool', 'GB')
    ], '2026-09-30')

    expect(cruzarJugadoresConPartidos(jugador, [partidoLiverpool], '2026-09-30')).toMatchObject([{
      jugador: { slug: 'luis-diaz' },
      partido: { id: 'fixture-liverpool' },
      rival: 'Rival FC',
      clubLocal: true,
      horaColombia: '13:00'
    }])
    expect(cruzarJugadoresConPartidos(jugador, [{
      ...partidoLiverpool,
      equipoLocal: { ...partidoLiverpool.equipoLocal, idInterno: undefined, nombre: 'Club team-liverpool' }
    }], '2026-09-30')).toEqual([])
  })

  it('solo muestra fixtures de fútbol de la fecha colombiana solicitada', () => {
    const jugador = filtrarMembresiasEuropeasActivas([
      crearMembresia('luis-diaz', 'Luis Díaz', 'team-liverpool', 'GB')
    ], '2026-09-30')

    expect(cruzarJugadoresConPartidos(jugador, [{
      ...partidoLiverpool,
      deporte: 'baloncesto',
      fechaIso: '2026-10-01T02:00:00Z'
    }], '2026-09-30')).toEqual([])
  })

  it('formatea el horario en la zona de Colombia y rechaza fechas inválidas', () => {
    expect(formatearHoraColombia('2026-09-30T18:00:00Z')).toBe('13:00')
    expect(formatearHoraColombia('fecha-invalida')).toBe('Hora por confirmar')
  })

  it('presenta el marcador en el orden club–rival, incluso si el club juega de visitante', () => {
    const jugador = filtrarMembresiasEuropeasActivas([
      crearMembresia('luis-diaz', 'Luis Díaz', 'team-liverpool', 'GB')
    ], '2026-09-30')
    const partido = {
      ...partidoLiverpool,
      estado: 'finalizado' as const,
      marcadorLocal: 1,
      marcadorVisitante: 3
    }
    const partidoVisitante = cruzarJugadoresConPartidos(jugador, [partido], '2026-09-30')[0]!

    expect(formatearResultadoClubRival(partidoVisitante)).toBe('1–3')
    expect(formatearResultadoClubRival({
      ...partidoVisitante,
      partido: { ...partido, equipoLocal: partido.equipoVisitante, equipoVisitante: partido.equipoLocal },
      clubLocal: false
    })).toBe('3–1')
  })
})
