import { describe, expect, it, vi } from 'vitest'
import type { PartidoFutbolProveedor, RespuestaProveedorFutbol } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from '~/server/utils/proveedoresFutbol/contrato'
import { LIGAS_CALENDARIO_COLOMBIANO_GOAL } from '~/server/utils/proveedoresFutbol/ligasPrioritariasGoal'
import {
  sincronizarCalendarioColombiano,
  type FilaCalendarioColombiano
} from '~/server/utils/proveedoresFutbol/sincronizadorCalendarioColombiano'

function fixture(overrides: Partial<PartidoFutbolProveedor> = {}): PartidoFutbolProveedor {
  return {
    idProveedor: 'goal-fixture-13',
    competencia: {
      idProveedor: LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id,
      nombre: 'Liga BetPlay',
      temporada: 2026,
      jornada: 'Fecha 13'
    },
    inicioUtc: '2026-10-05T23:00:00.000Z',
    estado: 'scheduled',
    local: { idProveedor: 'cucuta', nombre: 'Cúcuta Deportivo' },
    visitante: { idProveedor: 'pereira', nombre: 'Deportivo Pereira' },
    golesLocal: null,
    golesVisitante: null,
    sede: 'General Santander',
    ciudad: 'Cúcuta',
    ...overrides
  }
}

function respuesta(
  elementos: PartidoFutbolProveedor[],
  siguienteCursor?: string
): RespuestaProveedorFutbol<PartidoFutbolProveedor> {
  return {
    elementos,
    consultadoEn: '2026-10-05T18:00:00.000Z',
    solicitudes: 1,
    ...(siguienteCursor ? { siguienteCursor } : {})
  }
}

function crearProveedor(
  obtenerFixturesLiga: NonNullable<ProveedorFutbol['obtenerFixturesLiga']>
): ProveedorFutbol {
  return { id: 'goal-api', obtenerFixturesLiga } as unknown as ProveedorFutbol
}

describe('sincronizador del calendario colombiano', () => {
  it('pagina de forma acotada, hace upsert idempotente y conserva fuente y derechos', async () => {
    const primera = fixture()
    const mismaActualizada = fixture({ golesLocal: 2, estado: 'finished' })
    const obtenerFixturesLiga = vi.fn(async (idLiga: string, _limite: number, offset: number) => {
      if (idLiga === LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id) {
        return offset === 0 ? respuesta([primera], '100') : respuesta([mismaActualizada])
      }
      return respuesta([])
    })
    const upsertCalendario = vi.fn(async (_filas: FilaCalendarioColombiano[]) => undefined)
    const ahora = () => new Date('2026-10-05T18:00:00.000Z')

    const resultado = await sincronizarCalendarioColombiano({
      proveedor: crearProveedor(obtenerFixturesLiga),
      repositorio: { upsertCalendario },
      fechaNegocio: '2026-10-05',
      derechosPublicacionConfirmados: true,
      ahora
    })

    expect(resultado).toMatchObject({
      estado: 'completado', solicitudes: 4, fixturesRecibidos: 2,
      fixturesGuardados: 1, competicionesProcesadas: 3
    })
    expect(obtenerFixturesLiga.mock.calls.map(([id, limite, offset]) => [id, limite, offset])).toEqual([
      [LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id, 100, 0],
      [LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id, 100, 100],
      [LIGAS_CALENDARIO_COLOMBIANO_GOAL[1].id, 100, 0],
      [LIGAS_CALENDARIO_COLOMBIANO_GOAL[2].id, 100, 0]
    ])
    expect(upsertCalendario).toHaveBeenCalledOnce()
    expect(upsertCalendario.mock.calls[0]?.[0]).toEqual([expect.objectContaining({
      provider_fixture_id: 'goal-fixture-13',
      competition_slug: 'liga-betplay',
      season: '2026-II',
      round_name: 'Fecha 13',
      goals_home: 2,
      status: 'finished',
      source_url: 'https://goal-api.com/documentation',
      official_source_url: 'https://dimayor.com.co/programaciones-competencias-dimayor-2026/',
      is_public: true,
      publication_rights_confirmed: true
    })])
  })

  it('detiene la paginación por competición y sigue con las demás ligas', async () => {
    const obtenerFixturesLiga = vi.fn(async (idLiga: string, _limite: number, offset: number) => {
      if (idLiga === LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id) return respuesta([], String(offset + 100))
      return respuesta([])
    })
    const upsertCalendario = vi.fn(async (_filas: FilaCalendarioColombiano[]) => undefined)

    const resultado = await sincronizarCalendarioColombiano({
      proveedor: crearProveedor(obtenerFixturesLiga),
      repositorio: { upsertCalendario },
      fechaNegocio: '2026-10-05',
      derechosPublicacionConfirmados: false
    })

    expect(resultado).toMatchObject({
      estado: 'sin_datos', solicitudes: 10, competicionesProcesadas: 2,
      errorCode: 'LIMITE_PAGINAS'
    })
    expect(obtenerFixturesLiga).toHaveBeenCalledTimes(10)
    expect(upsertCalendario).not.toHaveBeenCalled()
  })

  it('detiene el recorrido de temporadas antiguas al salir de la ventana útil', async () => {
    const fixtureAntiguo = fixture({
      inicioUtc: '2025-12-30T23:00:00.000Z',
      competencia: { ...fixture().competencia, temporada: 2025 }
    })
    const obtenerFixturesLiga = vi.fn(async (idLiga: string, _limite: number, offset: number) => {
      if (idLiga === LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id) {
        return offset === 0 ? respuesta([fixture()], '100') : respuesta([fixtureAntiguo], '200')
      }
      return respuesta([])
    })
    const upsertCalendario = vi.fn(async (_filas: FilaCalendarioColombiano[]) => undefined)

    const resultado = await sincronizarCalendarioColombiano({
      proveedor: crearProveedor(obtenerFixturesLiga),
      repositorio: { upsertCalendario },
      fechaNegocio: '2026-10-05',
      derechosPublicacionConfirmados: false
    })

    expect(resultado).toMatchObject({ estado: 'completado', solicitudes: 4, fixturesGuardados: 1 })
    expect(obtenerFixturesLiga.mock.calls.filter(([id]) => id === LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id))
      .toHaveLength(2)
    expect(upsertCalendario.mock.calls[0]?.[0]?.[0]).toMatchObject({
      is_public: false,
      publication_rights_confirmed: false
    })
  })

  it('no admite fechas inválidas ni llama al proveedor', async () => {
    const obtenerFixturesLiga = vi.fn()
    const resultado = await sincronizarCalendarioColombiano({
      proveedor: crearProveedor(obtenerFixturesLiga),
      repositorio: { upsertCalendario: vi.fn() },
      fechaNegocio: 'mañana',
      derechosPublicacionConfirmados: true
    })

    expect(resultado.estado).toBe('fallido')
    expect(obtenerFixturesLiga).not.toHaveBeenCalled()
  })

  it('omite IDs fuera del formato SQL sin tumbar el lote de calendario', async () => {
    const obtenerFixturesLiga = vi.fn(async (idLiga: string) => respuesta(
      idLiga === LIGAS_CALENDARIO_COLOMBIANO_GOAL[0].id
        ? [fixture({ idProveedor: 'FIXTURE-UPPERCASE' })]
        : []
    ))
    const upsertCalendario = vi.fn(async (_filas: FilaCalendarioColombiano[]) => undefined)

    const resultado = await sincronizarCalendarioColombiano({
      proveedor: crearProveedor(obtenerFixturesLiga),
      repositorio: { upsertCalendario },
      fechaNegocio: '2026-10-05',
      derechosPublicacionConfirmados: true
    })

    expect(resultado.estado).toBe('sin_datos')
    expect(upsertCalendario).not.toHaveBeenCalled()
  })
})
