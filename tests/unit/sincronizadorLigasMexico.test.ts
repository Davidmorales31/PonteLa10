import { describe, expect, it } from 'vitest'
import type { ClasificacionFutbolProveedor, PartidoFutbolProveedor } from '../../types/futbolProveedor'
import type { ProveedorFutbol } from '../../server/utils/proveedoresFutbol/contrato'
import {
  claveEquipo,
  mapearPartido,
  mapearTabla,
  sincronizarLigasMexico,
  type FilaPartidoLiga,
  type FilaPosicionLiga
} from '../../server/utils/proveedoresFutbol/sincronizadorLigasMexico'
import { inicioTemporadaLigaMx, ligasMexico, temporadaLigaMx, torneoLigaMx } from '../../data/ligaMx'

const ahora = new Date('2026-11-19T15:00:00Z')

function partido(id: string, inicioUtc: string, extra: Partial<PartidoFutbolProveedor> = {}): PartidoFutbolProveedor {
  return {
    idProveedor: id,
    competencia: { idProveedor: 'liga', nombre: 'Liga MX', jornada: '17' },
    inicioUtc,
    estado: 'scheduled',
    local: { idProveedor: 'a', nombre: 'Querétaro' },
    visitante: { idProveedor: 'b', nombre: 'Necaxa' },
    golesLocal: null,
    golesVisitante: null,
    sede: 'Estadio La Corregidora',
    ...extra
  }
}

const tabla: ClasificacionFutbolProveedor = {
  competencia: { idProveedor: 'liga', nombre: 'Liga MX' },
  consultadoEn: '2026-11-19T15:00:00Z',
  grupos: [{
    nombre: 'Apertura · General', etapa: 'Apertura',
    filas: [{ posicion: 1, equipo: { idProveedor: 'c', nombre: 'Cruz Azul' }, jugados: 16, ganados: 10, empatados: 2, perdidos: 4, golesFavor: 37, golesContra: 26, diferenciaGoles: 11, puntos: 32 }]
  }]
}

function proveedorFalso(paginas: PartidoFutbolProveedor[][], clasificacion: ClasificacionFutbolProveedor | null = tabla) {
  const llamadas: Array<{ id: string, offset: number }> = []
  const proveedor = {
    id: 'goal-api',
    capacidades: {},
    async obtenerFixturesLiga(id: string, _limite: number, offset: number) {
      llamadas.push({ id, offset })
      const indice = offset / 100
      const elementos = paginas[indice] ?? []
      return { elementos, consultadoEn: ahora.toISOString(), solicitudes: 1, ...(indice + 1 < paginas.length ? { siguienteCursor: String(offset + 100) } : {}) }
    },
    async obtenerClasificacion() { return clasificacion }
  } as unknown as ProveedorFutbol
  return { proveedor, llamadas }
}

function repositorioFalso() {
  const partidos: FilaPartidoLiga[] = []
  const posiciones: FilaPosicionLiga[] = []
  return {
    partidos, posiciones,
    repositorio: {
      async upsertPartidos(filas: FilaPartidoLiga[]) { partidos.push(...filas) },
      async upsertPosiciones(filas: FilaPosicionLiga[]) { posiciones.push(...filas) }
    }
  }
}

describe('temporada y torneo de la Liga MX', () => {
  it('Apertura de julio a diciembre y Clausura de enero a junio, con temporada que empieza en julio', () => {
    expect(torneoLigaMx(new Date('2026-08-16T12:00:00Z'))).toBe('Apertura')
    expect(torneoLigaMx(new Date('2027-02-01T12:00:00Z'))).toBe('Clausura')
    expect(temporadaLigaMx(new Date('2026-11-23T01:10:00Z'))).toBe('2026-2027')
    expect(temporadaLigaMx(new Date('2027-05-20T02:00:00Z'))).toBe('2026-2027')
    expect(temporadaLigaMx(new Date('2026-06-20T02:00:00Z'))).toBe('2025-2026')
    // 1 de julio 00:30 en Ciudad de México ya es la nueva temporada aunque en UTC sea 06:30.
    expect(temporadaLigaMx(new Date('2026-07-01T06:30:00Z'))).toBe('2026-2027')
    expect(temporadaLigaMx(new Date('2026-07-01T05:30:00Z'))).toBe('2025-2026')
    expect(inicioTemporadaLigaMx('2026-2027')).toBe(Date.parse('2026-07-01T06:00:00Z'))
  })

  it('el catálogo trae las dos ligas con su identificador de proveedor', () => {
    expect(ligasMexico.map(liga => liga.slug)).toEqual(['liga-mx', 'liga-mx-femenil'])
    expect(new Set(ligasMexico.map(liga => liga.idGoal)).size).toBe(2)
  })
})

describe('mapeo de partidos y tabla', () => {
  it('convierte un partido de la temporada en curso y descarta otras temporadas o datos inválidos', () => {
    const fila = mapearPartido(partido('abc123', '2026-11-23T01:10:00Z'), 'liga-mx', '2026-2027', 'x', true)!
    expect(fila).toMatchObject({
      site: 'mx', competition_slug: 'liga-mx', season: '2026-2027', tournament: 'Apertura',
      round_name: 'Jornada 17', home_team: 'Querétaro', venue: 'Estadio La Corregidora',
      is_public: true, publication_rights_confirmed: true, goals_home: null
    })
    expect(mapearPartido(partido('abc', '2025-11-23T01:10:00Z'), 'liga-mx', '2026-2027', 'x', true)).toBeNull()
    expect(mapearPartido(partido('ABC DEF', '2026-11-23T01:10:00Z'), 'liga-mx', '2026-2027', 'x', true)).toBeNull()
    expect(mapearPartido(partido('abc', 'no-es-fecha'), 'liga-mx', '2026-2027', 'x', true)).toBeNull()
    expect(mapearPartido(partido('abc', '2026-11-23T01:10:00Z', { visitante: { idProveedor: 'z', nombre: 'QUERÉTARO' } }), 'liga-mx', '2026-2027', 'x', true)).toBeNull()
  })

  it('sin derechos de publicación confirmados nada queda público', () => {
    const fila = mapearPartido(partido('abc', '2026-11-23T01:10:00Z'), 'liga-mx', '2026-2027', 'x', false)!
    expect(fila.is_public).toBe(false)
    expect(mapearTabla(tabla, 'liga-mx', '2026-2027', 'x', false)[0]!.is_public).toBe(false)
  })

  it('la tabla toma la fase del torneo y una clave sin tildes', () => {
    const [fila] = mapearTabla(tabla, 'liga-mx', '2026-2027', 'x', true)
    expect(fila).toMatchObject({ phase: 'Apertura', team_key: 'cruz-azul', position: 1, points: 32, goal_difference: 11 })
    expect(claveEquipo('Atlético San Luis')).toBe('atletico-san-luis')
    expect(mapearTabla(null, 'liga-mx', '2026-2027', 'x', true)).toEqual([])
  })
})

describe('sincronización de las ligas de México', () => {
  it('guarda partidos y tabla de cada liga y cuenta las solicitudes', async () => {
    const { proveedor } = proveedorFalso([[partido('p1', '2026-11-23T01:10:00Z'), partido('p2', '2026-11-22T01:10:00Z')]])
    const { repositorio, partidos, posiciones } = repositorioFalso()
    const r = await sincronizarLigasMexico({ proveedor, repositorio, derechosPublicacionConfirmados: true, ahora: () => ahora })
    expect(r).toMatchObject({ estado: 'completado', ligasProcesadas: 2, partidosGuardados: 4, posicionesGuardadas: 2 })
    expect(r.solicitudes).toBe(2 * (1 + 1))
    expect(partidos.map(p => p.competition_slug).sort()).toEqual(['liga-mx', 'liga-mx', 'liga-mx-femenil', 'liga-mx-femenil'])
    expect(posiciones).toHaveLength(2)
  })

  it('deja de paginar al llegar a temporadas anteriores', async () => {
    const vieja = Array.from({ length: 3 }, (_, i) => partido(`v${i}`, '2025-03-01T01:00:00Z'))
    const { proveedor, llamadas } = proveedorFalso([[partido('n1', '2026-11-23T01:10:00Z')], vieja, vieja])
    const { repositorio } = repositorioFalso()
    await sincronizarLigasMexico({ proveedor, repositorio, derechosPublicacionConfirmados: true, ahora: () => ahora })
    // Por liga: página 1 (vigente) y página 2 (toda anterior), sin pedir la tercera.
    expect(llamadas.filter(l => l.id === ligasMexico[0].idGoal).map(l => l.offset)).toEqual([0, 100])
  })

  it('falla de forma cerrada si el proveedor sigue paginando más allá del tope', async () => {
    const vigente = (i: number) => [partido(`n${i}`, '2026-11-23T01:10:00Z')]
    const { proveedor } = proveedorFalso(Array.from({ length: 9 }, (_, i) => vigente(i)))
    const { repositorio, partidos } = repositorioFalso()
    const r = await sincronizarLigasMexico({ proveedor, repositorio, derechosPublicacionConfirmados: true, ahora: () => ahora })
    expect(r.estado).toBe('sin_datos')
    expect(r.errorCode).toBe('LIMITE_PAGINAS')
    expect(partidos).toHaveLength(0)
  })

  it('rechaza un proveedor que no es GOAL API y avisa si no hay datos', async () => {
    const { repositorio } = repositorioFalso()
    const otro = { id: 'api-football' } as unknown as ProveedorFutbol
    expect((await sincronizarLigasMexico({ proveedor: otro, repositorio, derechosPublicacionConfirmados: true })).errorCode).toBe('PROVEEDOR_NO_DISPONIBLE')
    const { proveedor } = proveedorFalso([[]], null)
    expect((await sincronizarLigasMexico({ proveedor, repositorio, derechosPublicacionConfirmados: true, ahora: () => ahora })).estado).toBe('sin_datos')
  })

  it('si el guardado falla, informa fallido y no declara filas guardadas', async () => {
    const { proveedor } = proveedorFalso([[partido('p1', '2026-11-23T01:10:00Z')]])
    const repositorio = { upsertPartidos: async () => { throw new Error('boom') }, upsertPosiciones: async () => {} }
    const r = await sincronizarLigasMexico({ proveedor, repositorio, derechosPublicacionConfirmados: true, ahora: () => ahora })
    expect(r).toMatchObject({ estado: 'fallido', partidosGuardados: 0, errorCode: 'GUARDADO_FALLIDO' })
  })
})
