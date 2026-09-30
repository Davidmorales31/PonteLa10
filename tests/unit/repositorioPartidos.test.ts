import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerIdProveedorPorSlugPartido } from '../../server/utils/repositorioEntidadesDeportivasPublicas'

const datosSupabase = vi.hoisted(() => ({
  fixture: { id: 'fixture-interno-1', slug: 'america-vs-deportivo-cali-2026-09-30' } as { id: string; slug: string } | null,
  mapeos: [
    { provider: 'api-sports', external_id: '98765', fixture_id: 'fixture-interno-1' },
    { provider: 'the-sports-db', external_id: '12345', fixture_id: 'fixture-interno-1' }
  ] as Array<{ provider: string; external_id: string; fixture_id: string }>
}))

type ResultadoMapeos = { data: typeof datosSupabase.mapeos; error: null }
type ResultadoFixture = { data: typeof datosSupabase.fixture; error: null }

interface ConsultaSupabaseSimulada extends PromiseLike<ResultadoMapeos> {
  select(): ConsultaSupabaseSimulada
  eq(columna: string, valor: unknown): ConsultaSupabaseSimulada
  maybeSingle(): Promise<ResultadoFixture>
  then<TResult1 = ResultadoMapeos, TResult2 = never>(
    onfulfilled?: ((valor: ResultadoMapeos) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((razon: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (tabla: string) => {
      const filtros: Record<string, unknown> = {}
      const consulta: ConsultaSupabaseSimulada = {
        select: () => consulta,
        eq: (columna, valor) => {
          filtros[columna] = valor
          return consulta
        },
        maybeSingle: async () => ({
          data: datosSupabase.fixture?.slug === filtros.slug ? datosSupabase.fixture : null,
          error: null
        }),
        then: (onfulfilled, onrejected) => {
          const data = tabla === 'sports_provider_mappings'
            ? datosSupabase.mapeos.filter(mapeo => mapeo.fixture_id === filtros.fixture_id)
            : []
          return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected)
        }
      }
      return consulta
    }
  })
}))

const supabasePublico = { supabaseUrl: 'https://supabase.example.test', supabaseKey: 'clave-publica-de-prueba' }
const configuracionBase = { apiSportsKey: '' }

describe('resolución de URL interna de partido', () => {
  beforeEach(() => {
    datosSupabase.fixture = { id: 'fixture-interno-1', slug: 'america-vs-deportivo-cali-2026-09-30' }
    datosSupabase.mapeos = [
      { provider: 'api-sports', external_id: '98765', fixture_id: 'fixture-interno-1' },
      { provider: 'the-sports-db', external_id: '12345', fixture_id: 'fixture-interno-1' }
    ]
  })

  it('elige el proveedor configurado y conserva la identidad exacta', async () => {
    const id = await obtenerIdProveedorPorSlugPartido(
      supabasePublico,
      { apiSportsKey: 'api-sports-configurada' },
      'america-vs-deportivo-cali-2026-09-30'
    )

    expect(id).toBe('98765')
  })

  it('usa la alternativa compatible cuando API-Sports no está configurada', async () => {
    const id = await obtenerIdProveedorPorSlugPartido(
      supabasePublico,
      configuracionBase,
      'america-vs-deportivo-cali-2026-09-30'
    )

    expect(id).toBe('tsdb-12345')
  })

  it('no inventa un proveedor cuando slug o mapping no existen', async () => {
    const slugInexistente = await obtenerIdProveedorPorSlugPartido(
      supabasePublico,
      configuracionBase,
      'otro-vs-otro-2026-09-30'
    )
    datosSupabase.mapeos = []
    const sinMapping = await obtenerIdProveedorPorSlugPartido(
      supabasePublico,
      configuracionBase,
      'america-vs-deportivo-cali-2026-09-30'
    )

    expect(slugInexistente).toBeUndefined()
    expect(sinMapping).toBeUndefined()
  })

  it('no intenta consultar si Supabase público no está configurado', async () => {
    await expect(obtenerIdProveedorPorSlugPartido(undefined, configuracionBase, 'america-vs-deportivo-cali-2026-09-30'))
      .resolves.toBeUndefined()
  })
})
